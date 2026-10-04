// @ts-check
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const WRANGLER_CONFIG = "wrangler.jsonc";
export const PLACEHOLDER_D1_ID = "00000000-0000-0000-0000-000000000000";
export const PLACEHOLDER_KV_ID = "00000000000000000000000000000000";

/** Walks up from `cwd` to the directory holding wrangler.jsonc. */
export function findProjectRoot(cwd = process.cwd()) {
	let dir = path.resolve(cwd);
	while (true) {
		if (existsSync(path.join(dir, WRANGLER_CONFIG))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) {
			throw new Error(`No ${WRANGLER_CONFIG} found. Run this inside a Capsulo project.`);
		}
		dir = parent;
	}
}

/**
 * The project's own wrangler (a peer dependency), so the CLI and the project always agree.
 * @param {string} root
 * @returns {Promise<any>}
 */
export async function importWrangler(root) {
	const require = createRequire(path.join(root, "package.json"));
	return import(pathToFileURL(require.resolve("wrangler")).href);
}

/**
 * @typedef {{ binding: string, database_name: string, database_id?: string }} D1Config
 * @typedef {{ binding: string, id?: string }} KvConfig
 * @typedef {{ binding: string, bucket_name: string }} R2Config
 * @typedef {{ name: string, account_id?: string, d1: D1Config, kv?: KvConfig, r2?: R2Config }} ProjectConfig
 *
 * Uploads live in the KV namespace bound as UPLOADS (the default: no payment method
 * needed) or the R2 bucket bound as UPLOADS_BUCKET. A project moved to R2 keeps its
 * KV binding as a read-only fallback, so it can have both.
 */

export const KV_BINDING = "UPLOADS";
export const R2_BINDING = "UPLOADS_BUCKET";

/**
 * @param {string} root
 * @returns {Promise<ProjectConfig>}
 */
export async function readProjectConfig(root) {
	const wrangler = await importWrangler(root);
	const config = wrangler.unstable_readConfig({ config: path.join(root, WRANGLER_CONFIG) }, { hideWarnings: true });
	const d1 = config.d1_databases?.find((/** @type {D1Config} */ db) => db.binding === "DB");
	const kv = config.kv_namespaces?.find((/** @type {KvConfig} */ ns) => ns.binding === KV_BINDING);
	const r2 = config.r2_buckets?.find((/** @type {R2Config} */ bucket) => bucket.binding === R2_BINDING);
	if (!d1) throw new Error(`${WRANGLER_CONFIG} must define the DB (D1) binding.`);
	if (!kv && !r2) {
		throw new Error(`${WRANGLER_CONFIG} must define upload storage: the ${KV_BINDING} (KV) or ${R2_BINDING} (R2) binding.`);
	}
	return { name: config.name, account_id: config.account_id, d1, kv, r2 };
}

/** @param {string | undefined} id */
export function isRealD1Id(id) {
	return Boolean(id && id !== PLACEHOLDER_D1_ID);
}

/** @param {string | undefined} id */
export function isRealKvId(id) {
	return Boolean(id && id !== PLACEHOLDER_KV_ID);
}

/**
 * Adds the R2 upload binding to wrangler.jsonc, right after the KV one when there is one,
 * keeping comments and formatting.
 * @param {string} root
 * @param {string} bucketName
 */
export async function addR2Binding(root, bucketName) {
	const file = path.join(root, WRANGLER_CONFIG);
	const source = await readFile(file, "utf8");
	const block = `\t"r2_buckets": [\n\t\t{\n\t\t\t"binding": "${R2_BINDING}",\n\t\t\t"bucket_name": "${bucketName}"\n\t\t}\n\t],\n`;
	const afterKv = source.match(/\n([ \t]*)"kv_namespaces"\s*:\s*\[[\s\S]*?\n\1\],?[ \t]*\n/);
	let next;
	if (afterKv?.index !== undefined) {
		const end = afterKv.index + afterKv[0].length;
		const kvBlock = afterKv[0].replace(/\][ \t]*\n$/, "],\n");
		next = source.slice(0, afterKv.index) + kvBlock + block + source.slice(end);
	} else {
		const insertAt = source.search(/\n[ \t]*"observability"/);
		if (insertAt < 0) throw new Error(`Could not find where to add the R2 binding in ${WRANGLER_CONFIG}.`);
		next = `${source.slice(0, insertAt + 1)}${block}${source.slice(insertAt + 1)}`;
	}
	await writeFile(file, next);
}

/**
 * Replaces a string value in wrangler.jsonc in place, keeping comments and formatting.
 * @param {string} root
 * @param {string} key JSON key, e.g. "database_id"
 * @param {string} currentValue
 * @param {string} nextValue
 */
export async function replaceWranglerValue(root, key, currentValue, nextValue) {
	const file = path.join(root, WRANGLER_CONFIG);
	const source = await readFile(file, "utf8");
	const needle = new RegExp(`("${key}"\\s*:\\s*)"${currentValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
	if (!needle.test(source)) throw new Error(`Could not find "${key}": "${currentValue}" in ${WRANGLER_CONFIG}.`);
	await writeFile(file, source.replace(needle, `$1"${nextValue}"`));
}

/**
 * Committed deploy state, read by `capsulo pull` in CI.
 * @typedef {{ siteUrl?: string, accountId?: string }} ProjectState
 */

/** @param {string} root */
function stateFile(root) {
	return path.join(root, ".capsulo", "project.json");
}

/**
 * @param {string} root
 * @returns {Promise<ProjectState>}
 */
export async function readProjectState(root) {
	try {
		return JSON.parse(await readFile(stateFile(root), "utf8"));
	} catch {
		return {};
	}
}

/**
 * @param {string} root
 * @param {ProjectState} patch
 */
export async function updateProjectState(root, patch) {
	const next = { ...(await readProjectState(root)), ...patch };
	await mkdir(path.dirname(stateFile(root)), { recursive: true });
	await writeFile(stateFile(root), `${JSON.stringify(next, null, "\t")}\n`);
	return next;
}
