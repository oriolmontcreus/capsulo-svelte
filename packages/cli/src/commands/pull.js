// @ts-check
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";

import { openDatabase } from "../lib/d1.js";
import { findProjectRoot, readProjectState } from "../lib/project.js";

export const PULL_HELP = `Snapshot the published CMS content for the static build.

Usage:
  capsulo pull            from the deployed site (siteUrl in .capsulo/project.json)
  capsulo pull --local    from the local D1/KV that \`astro dev\` uses
  capsulo pull --from <url>

Writes .capsulo/published/content.json and copies uploaded files to public/uploads/.
Runs automatically before \`astro build\` (the "prebuild" script).`;

/** Same shape the Worker generates (src/lib/server/uploads.ts); also keeps writes inside public/uploads. */
const UPLOAD_KEY = /^[0-9a-f]{32}-[a-z0-9.\-_]+$/;
const RETRY_WINDOW_MS = 120_000;
const RETRY_DELAY_MS = 10_000;

/**
 * @typedef {{
 *   formatVersion: number,
 *   pages: Record<string, unknown>,
 *   globals: unknown,
 *   uploads: { key: string, content_type: string }[],
 * }} PublishedExport
 */

/** @type {PublishedExport} */
const EMPTY_EXPORT = { formatVersion: 1, pages: {}, globals: null, uploads: [] };

/**
 * @param {string} root
 * @returns {Promise<{ data: PublishedExport, fetchUpload: (key: string) => Promise<ArrayBuffer | null>, close: () => Promise<void> }>}
 */
async function readLocal(root) {
	const db = await openDatabase(root, { remote: false });
	const pages = await db.all("SELECT page_id, content FROM pages ORDER BY page_id");
	const [globals] = await db.all("SELECT content FROM globals WHERE id = 'globals'");
	const uploads = await db.all("SELECT key, content_type FROM uploads ORDER BY key");
	return {
		data: {
			formatVersion: 1,
			pages: Object.fromEntries(pages.map((row) => [row.page_id, JSON.parse(row.content)])),
			globals: globals ? JSON.parse(globals.content) : null,
			uploads,
		},
		fetchUpload: (key) => db.uploads?.get(key) ?? Promise.resolve(null),
		close: () => db.close(),
	};
}

/**
 * @param {string} siteUrl
 */
async function readRemote(siteUrl) {
	const base = siteUrl.replace(/\/+$/, "");
	const response = await fetch(`${base}/api/capsulo/export`, { headers: { Accept: "application/json" } });
	if (!response.ok) throw new Error(`GET ${base}/api/capsulo/export responded ${response.status}.`);
	const data = /** @type {PublishedExport} */ (await response.json());
	return {
		data,
		/** @param {string} key */
		fetchUpload: async (key) => {
			const upload = await fetch(`${base}/api/capsulo/media/${encodeURIComponent(key)}`);
			if (upload.status === 404) return null;
			if (!upload.ok) throw new Error(`Downloading ${key} failed with ${upload.status}.`);
			return upload.arrayBuffer();
		},
		close: async () => {},
	};
}

/**
 * Copies every upload into public/uploads (so it ships as a free static asset) and
 * removes files that were deleted in the CMS. Newly uploaded files can take up to a
 * minute to be readable from other locations (KV is eventually consistent), so missing
 * ones are retried before giving up: a build must not ship broken images.
 * @param {string} uploadsDir
 * @param {string[]} keys
 * @param {(key: string) => Promise<ArrayBuffer | null>} fetchUpload
 */
async function syncUploads(uploadsDir, keys, fetchUpload) {
	const invalid = keys.find((key) => !UPLOAD_KEY.test(key));
	if (invalid) throw new Error(`Refusing to write unexpected upload key "${invalid}".`);
	await mkdir(uploadsDir, { recursive: true });
	const wanted = new Set(keys);
	for (const file of await readdir(uploadsDir)) {
		if (!wanted.has(file) && file !== ".gitkeep") await rm(path.join(uploadsDir, file));
	}

	let pending = keys.filter((key) => !existsSync(path.join(uploadsDir, key)));
	const deadline = Date.now() + RETRY_WINDOW_MS;
	let downloaded = 0;
	while (pending.length > 0) {
		/** @type {string[]} */
		const missing = [];
		for (const key of pending) {
			const bytes = await fetchUpload(key);
			if (!bytes) {
				missing.push(key);
				continue;
			}
			await writeFile(path.join(uploadsDir, key), new Uint8Array(bytes));
			downloaded++;
		}
		pending = missing;
		if (pending.length === 0) break;
		if (Date.now() > deadline) throw new Error(`Uploads not found: ${pending.join(", ")}`);
		p.log.warn(`${pending.length} upload(s) not readable yet, retrying in ${RETRY_DELAY_MS / 1000}s...`);
		await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
	}
	return downloaded;
}

/** @param {string[]} argv */
export async function pullCommand(argv) {
	const { values } = parseArgs({
		args: argv,
		options: { local: { type: "boolean" }, from: { type: "string" }, help: { type: "boolean", short: "h" } },
	});
	if (values.help) {
		console.log(PULL_HELP);
		return;
	}

	const root = findProjectRoot();
	const outDir = path.join(root, ".capsulo", "published");
	const uploadsDir = path.join(root, "public", "uploads");
	const siteUrl = values.from ?? process.env.CAPSULO_SITE_URL ?? (await readProjectState(root)).siteUrl;

	let source;
	if (values.local) {
		source = await readLocal(root);
		p.log.info("Pulling published content from the local database.");
	} else if (siteUrl) {
		// A failed pull must fail the build: deploying without content would blank the live site.
		source = await readRemote(siteUrl);
		p.log.info(`Pulling published content from ${siteUrl}.`);
	} else {
		p.log.warn("No siteUrl yet (the site was never deployed): building with schema defaults.");
		source = { data: EMPTY_EXPORT, fetchUpload: async () => null, close: async () => {} };
	}

	try {
		const { data } = source;
		await mkdir(outDir, { recursive: true });
		await writeFile(
			path.join(outDir, "content.json"),
			`${JSON.stringify({ formatVersion: data.formatVersion, pages: data.pages, globals: data.globals })}\n`,
		);
		const downloaded = await syncUploads(
			uploadsDir,
			data.uploads.map((upload) => upload.key),
			source.fetchUpload,
		);
		p.log.success(
			`Pulled ${Object.keys(data.pages).length} page(s), ${data.globals ? "globals" : "no globals"}, ` +
				`${data.uploads.length} upload(s) (${downloaded} downloaded).`,
		);
	} finally {
		await source.close();
	}
}
