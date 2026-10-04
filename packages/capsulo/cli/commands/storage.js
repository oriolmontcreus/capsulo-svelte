// @ts-check
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";

import { openDatabase } from "../lib/d1.js";
import { setVerbose } from "../lib/exec.js";
import {
	KV_BINDING,
	R2_BINDING,
	WRANGLER_CONFIG,
	addR2Binding,
	findProjectRoot,
	importWrangler,
	isRealKvId,
	readProjectConfig,
	readProjectState,
} from "../lib/project.js";
import { ensureR2Bucket } from "../lib/r2.js";
import { runWrangler } from "../lib/wrangler.js";
import { buildAndDeploy, commitDeployState, ensureLogin } from "./deploy.js";

export const STORAGE_HELP = `Show or change where uploaded files are stored.

Usage:
  capsulo storage            show where this project stores uploads
  capsulo storage r2         move uploads from Workers KV to R2

Options (r2):
  --bucket-name <name>   R2 bucket to use (default: <project>-uploads)
  --local                only move the files of the local dev storage
  -y, --yes              accept the defaults and don't ask
  --verbose              show the full output of wrangler and astro

KV is the default: it needs no payment method, and files are limited to 25 MB.
R2 takes files up to 100 MB (the Worker request limit) and has 10 GB of free storage,
but Cloudflare asks for a payment method once before R2 can be enabled.

\`capsulo storage r2\` enables R2 (guiding you through the payment method step), creates
the bucket, adds it to ${WRANGLER_CONFIG}, deploys so new uploads go to R2, then copies
every existing file. The KV binding stays as a read-only fallback, so nothing breaks
while files are copied. Safe to re-run: it copies whatever is still missing.`;

/** @param {string} root */
async function showStorage(root) {
	const config = await readProjectConfig(root);
	if (config.r2) {
		p.log.info(`Uploads are stored in the R2 bucket "${config.r2.bucket_name}" (files up to 100 MB).`);
		if (config.kv) p.log.info("The KV namespace is still bound, as a read-only fallback for older files.");
	} else {
		p.log.info("Uploads are stored in Workers KV (files up to 25 MB).");
		p.log.info("Run `capsulo storage r2` to move them to R2 for bigger files and more space.");
	}
}

/**
 * @typedef {{ key: string, content_type: string }} UploadRow
 * @typedef {{
 *   has?: (key: string) => Promise<boolean>,
 *   put: (key: string, bytes: ArrayBuffer, contentType: string) => Promise<void>,
 *   close: () => Promise<void>,
 * }} Target
 */

/**
 * Copies every upload recorded in D1 into R2. `read` returns null for a file that is
 * not readable (yet); those are reported so the command can be re-run.
 * @param {UploadRow[]} uploads
 * @param {(key: string) => Promise<ArrayBuffer | null>} read
 * @param {Target} target
 */
async function copyUploads(uploads, read, target) {
	/** @type {string[]} */
	const missing = [];
	const progress = p.progress({ max: Math.max(uploads.length, 1) });
	progress.start(`Copying ${uploads.length} file${uploads.length === 1 ? "" : "s"} to R2`);
	try {
		for (const upload of uploads) {
			if (await target.has?.(upload.key)) {
				progress.advance(1);
				continue;
			}
			const bytes = await read(upload.key);
			if (bytes) await target.put(upload.key, bytes, upload.content_type);
			else missing.push(upload.key);
			progress.advance(1);
		}
	} catch (error) {
		progress.error("Copying failed");
		throw error;
	} finally {
		await target.close();
	}
	progress.stop(`${uploads.length - missing.length} of ${uploads.length} files are in R2`);
	return missing;
}

/**
 * The local dev storage: both bindings through wrangler's platform proxy.
 * @param {string} root
 */
async function moveLocal(root) {
	const wrangler = await importWrangler(root);
	const { env, dispose } = await wrangler.getPlatformProxy({
		configPath: path.join(root, WRANGLER_CONFIG),
		persist: true,
	});
	try {
		const { results } = await env.DB.prepare("SELECT key, content_type FROM uploads ORDER BY key").all();
		const uploads = /** @type {UploadRow[]} */ (results);
		return await copyUploads(uploads, (key) => env.UPLOADS?.get(key, "arrayBuffer") ?? Promise.resolve(null), {
			has: async (key) => (await env[R2_BINDING].head(key)) !== null,
			async put(key, bytes, contentType) {
				await env[R2_BINDING].put(key, bytes, { httpMetadata: { contentType } });
			},
			close: async () => {},
		});
	} finally {
		await dispose();
	}
}

/**
 * The deployed storage. Files are read through the deployed Worker (which already
 * prefers R2 and falls back to KV) and written with wrangler.
 * @param {string} root
 * @param {string} siteUrl
 * @param {string} bucketName
 */
async function moveRemote(root, siteUrl, bucketName) {
	const db = await openDatabase(root, { remote: true });
	/** @type {UploadRow[]} */
	let uploads;
	try {
		uploads = await db.all("SELECT key, content_type FROM uploads ORDER BY key");
	} finally {
		await db.close();
	}

	const base = siteUrl.replace(/\/+$/, "");
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "capsulo-r2-"));
	return copyUploads(
		uploads,
		async (key) => {
			const response = await fetch(`${base}/api/capsulo/media/${encodeURIComponent(key)}`);
			if (response.status === 404) return null;
			if (!response.ok) throw new Error(`Downloading ${key} failed with ${response.status}.`);
			return response.arrayBuffer();
		},
		{
			async put(key, bytes, contentType) {
				const file = path.join(tempDir, "upload");
				await writeFile(file, new Uint8Array(bytes));
				await runWrangler(root, [
					"r2",
					"object",
					"put",
					`${bucketName}/${key}`,
					"--file",
					file,
					"--content-type",
					contentType,
					"--remote",
				]);
			},
			close: () => rm(tempDir, { recursive: true, force: true }),
		},
	);
}

/**
 * @param {string} root
 * @param {{ bucketName?: string, local: boolean, yes: boolean }} options
 */
async function moveToR2(root, { bucketName, local, yes }) {
	let config = await readProjectConfig(root);
	if (config.r2 && !config.kv) {
		p.log.info(`This project already stores uploads in the R2 bucket "${config.r2.bucket_name}".`);
		return;
	}
	const bucket = config.r2?.bucket_name ?? bucketName ?? `${config.name}-uploads`;
	if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
		throw new Error(`"${bucket}" is not a valid R2 bucket name (3-63 lowercase letters, numbers or dashes).`);
	}
	const deployed = !local && isRealKvId(config.kv?.id) && Boolean((await readProjectState(root)).siteUrl);

	if (!local && !deployed) {
		p.log.info("This project is not deployed yet, so only its local files are moved.");
	}

	if (deployed) {
		const accountId = await ensureLogin(root);
		await ensureR2Bucket(root, {
			accountId,
			bucketName: bucket,
			yes,
		});
	}

	if (!config.r2) {
		await addR2Binding(root, bucket);
		config = await readProjectConfig(root);
		p.log.success(`Added the ${R2_BINDING} binding (bucket "${bucket}") to ${WRANGLER_CONFIG}.`);
	}

	const localMissing = await moveLocal(root);
	if (localMissing.length > 0) p.log.warn(`${localMissing.length} local file(s) were not found in KV and were skipped.`);
	if (!deployed) {
		p.log.info("New uploads now go to R2. `capsulo deploy` creates the bucket in your Cloudflare account.");
		return;
	}

	// Deploy first, so uploads made while copying already land in R2.
	const siteUrl = await buildAndDeploy(root, false);
	if (!siteUrl) throw new Error("The deploy did not report a site URL, so the files could not be copied.");
	const missing = await moveRemote(root, siteUrl, bucket);
	await commitDeployState(root, yes);

	if (missing.length > 0) {
		p.log.warn(
			`${missing.length} file(s) could not be read yet (new uploads can take a minute to show up). ` +
				"Run `capsulo storage r2` again to copy them.",
		);
		return;
	}
	p.note(
		[
			`All uploads are in the R2 bucket "${bucket}", and new ones go there too.`,
			`The ${KV_BINDING} KV namespace is still bound as a read-only fallback. Once you've`,
			`checked the site, you can remove its "kv_namespaces" block from ${WRANGLER_CONFIG},`,
			"run `capsulo deploy`, and delete the namespace in the Cloudflare dashboard.",
		].join("\n"),
		"Moved to R2",
	);
}

/** @param {string[]} argv */
export async function storageCommand(argv) {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			"bucket-name": { type: "string" },
			local: { type: "boolean" },
			yes: { type: "boolean", short: "y" },
			verbose: { type: "boolean" },
			help: { type: "boolean", short: "h" },
		},
	});
	const [action] = positionals;
	if (values.help || (action && action !== "r2")) {
		console.log(STORAGE_HELP);
		if (action && action !== "r2" && !values.help) process.exitCode = 1;
		return;
	}
	setVerbose(values.verbose ?? false);
	const root = findProjectRoot();

	if (!action) {
		await showStorage(root);
		return;
	}

	p.intro("capsulo storage r2");
	await moveToR2(root, { bucketName: values["bucket-name"], local: values.local ?? false, yes: values.yes ?? false });
	p.outro("Done.");
}
