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
	// Same filter as the Worker's export: only files the published content uses.
	const uploads = await db.all(
		`SELECT key, content_type FROM uploads u
		 WHERE EXISTS (SELECT 1 FROM pages WHERE instr(pages.content, u.key) > 0)
		    OR EXISTS (SELECT 1 FROM globals WHERE instr(globals.content, u.key) > 0)
		 ORDER BY key`,
	);
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
 * @param {(message: string) => void} notice
 */
async function syncUploads(uploadsDir, keys, fetchUpload, notice) {
	const invalid = keys.find((key) => !UPLOAD_KEY.test(key));
	if (invalid) throw new Error(`Refusing to write unexpected upload key "${invalid}".`);
	await mkdir(uploadsDir, { recursive: true });
	const wanted = new Set(keys);
	for (const file of await readdir(uploadsDir)) {
		if (!wanted.has(file) && file !== ".gitkeep") await rm(path.join(uploadsDir, file));
	}

	let pending = keys.filter((key) => !existsSync(path.join(uploadsDir, key)));
	const deadline = Date.now() + RETRY_WINDOW_MS;
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
		}
		pending = missing;
		if (pending.length === 0) break;
		if (Date.now() > deadline) throw new Error(`Uploads not found: ${pending.join(", ")}`);
		notice(`${pending.length} upload(s) not readable yet, retrying in ${RETRY_DELAY_MS / 1000}s...`);
		await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
	}
}

/**
 * Writes the content snapshot and syncs uploads. Returns a one-line summary.
 * @param {string} root
 * @param {{ local?: boolean, from?: string, onNotice?: (message: string) => void }} [options]
 */
export async function pullContent(root, options = {}) {
	const notice = options.onNotice ?? ((message) => p.log.warn(message));
	const outDir = path.join(root, ".capsulo", "published");
	const uploadsDir = path.join(root, "public", "uploads");
	const siteUrl = options.from ?? process.env.CAPSULO_SITE_URL ?? (await readProjectState(root)).siteUrl;

	let source;
	let origin;
	if (options.local) {
		source = await readLocal(root);
		origin = "the local database";
	} else if (siteUrl) {
		// A failed pull must fail the build: deploying without content would blank the live site.
		source = await readRemote(siteUrl);
		origin = siteUrl;
	} else {
		notice("Not deployed yet, so the site is built with schema defaults.");
		source = { data: EMPTY_EXPORT, fetchUpload: async () => null, close: async () => {} };
		origin = null;
	}

	try {
		const { data } = source;
		await mkdir(outDir, { recursive: true });
		await writeFile(
			path.join(outDir, "content.json"),
			`${JSON.stringify({ formatVersion: data.formatVersion, pages: data.pages, globals: data.globals })}\n`,
		);
		await syncUploads(
			uploadsDir,
			data.uploads.map((upload) => upload.key),
			source.fetchUpload,
			notice,
		);
		const pages = Object.keys(data.pages).length;
		const counts = `${pages} page${pages === 1 ? "" : "s"}, ${data.uploads.length} upload${data.uploads.length === 1 ? "" : "s"}`;
		return origin ? `Content pulled from ${origin} (${counts})` : "Content snapshot written (nothing published yet)";
	} finally {
		await source.close();
	}
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

	p.log.success(await pullContent(findProjectRoot(), { local: values.local, from: values.from }));
}
