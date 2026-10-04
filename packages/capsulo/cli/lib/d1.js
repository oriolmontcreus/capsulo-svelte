// @ts-check
import path from "node:path";

import { importWrangler, isRealD1Id, readProjectConfig, readProjectState, WRANGLER_CONFIG } from "./project.js";
import { apiToken, whoami } from "./wrangler.js";

/**
 * Minimal database handle over either the local D1 (what `astro dev` uses) or the
 * deployed one (Cloudflare REST API with bound parameters).
 * @typedef {{ sql: string, params?: unknown[] }} Statement
 * @typedef {{
 *   label: string,
 *   all: (sql: string, params?: unknown[]) => Promise<any[]>,
 *   batch: (statements: Statement[]) => Promise<void>,
 *   uploads: { get: (key: string) => Promise<ArrayBuffer | null> } | null,
 *   close: () => Promise<void>,
 * }} Database
 */

/**
 * @param {string} root
 * @returns {Promise<Database>}
 */
async function openLocal(root) {
	const wrangler = await importWrangler(root);
	const { env, dispose } = await wrangler.getPlatformProxy({
		configPath: path.join(root, WRANGLER_CONFIG),
		persist: true,
	});
	return {
		label: "local D1 (.wrangler/state)",
		async all(sql, params = []) {
			return (await env.DB.prepare(sql).bind(...params).all()).results;
		},
		async batch(statements) {
			await env.DB.batch(statements.map((s) => env.DB.prepare(s.sql).bind(...(s.params ?? []))));
		},
		uploads: {
			async get(key) {
				// R2 first; a project moved to R2 keeps KV as a fallback (see project.js).
				const object = await env.UPLOADS_BUCKET?.get(key);
				if (object) return object.arrayBuffer();
				return env.UPLOADS ? env.UPLOADS.get(key, "arrayBuffer") : null;
			},
		},
		close: () => dispose(),
	};
}

/**
 * @param {string} root
 * @returns {Promise<string>}
 */
async function resolveAccountId(root) {
	const state = await readProjectState(root);
	if (state.accountId) return state.accountId;
	const config = await readProjectConfig(root);
	if (config.account_id) return config.account_id;
	if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;

	const user = await whoami(root);
	if (!user.loggedIn) throw new Error("Not logged in to Cloudflare. Run `npx wrangler login`.");
	if (user.accounts.length === 1) return user.accounts[0].id;
	throw new Error(
		"Your login has several Cloudflare accounts. Set CLOUDFLARE_ACCOUNT_ID or run `capsulo deploy` to pick one.",
	);
}

/**
 * @param {string} root
 * @returns {Promise<Database>}
 */
async function openRemote(root) {
	const config = await readProjectConfig(root);
	if (!isRealD1Id(config.d1.database_id)) {
		throw new Error("This project has no remote database yet. Run `capsulo deploy` first (or use --local).");
	}
	const [accountId, token] = await Promise.all([resolveAccountId(root), apiToken(root)]);
	const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${config.d1.database_id}/query`;

	/** @param {object} body */
	async function query(body) {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const payload = /** @type {any} */ (await response.json().catch(() => ({})));
		if (!response.ok || !payload.success) {
			const message = payload.errors?.map((/** @type {any} */ e) => e.message).join("; ");
			throw new Error(`D1 query failed (${response.status}): ${message || response.statusText}`);
		}
		return /** @type {any[]} */ (payload.result);
	}

	return {
		label: `remote D1 "${config.d1.database_name}"`,
		async all(sql, params = []) {
			return (await query({ sql, params }))[0]?.results ?? [];
		},
		async batch(statements) {
			await query({ batch: statements.map((s) => ({ sql: s.sql, params: s.params ?? [] })) });
		},
		uploads: null,
		async close() {},
	};
}

/**
 * @param {string} root
 * @param {{ remote: boolean }} options
 */
export function openDatabase(root, { remote }) {
	return remote ? openRemote(root) : openLocal(root);
}
