// @ts-check
import { execNodeBin } from "./exec.js";

/**
 * Runs the project's wrangler (no shell, no npx).
 * - default: output hidden unless it fails or --verbose is on; returns stdout.
 * - `json`:  stdout captured for parsing.
 * - `interactive`: wrangler owns the terminal (e.g. `wrangler login`).
 * @param {string} root
 * @param {string[]} args
 * @param {{ json?: boolean, interactive?: boolean, input?: string }} [options]
 * @returns {Promise<string>}
 */
export async function runWrangler(root, args, options = {}) {
	const mode = options.interactive ? "inherit" : options.json ? "json" : "quiet";
	const { stdout } = await execNodeBin(root, "wrangler", "wrangler", args, { mode, input: options.input });
	return stdout;
}

/**
 * Parses the first JSON value in wrangler's stdout (warnings may precede it).
 * @param {string} output
 */
export function parseJsonOutput(output) {
	const start = output.search(/[[{]/);
	if (start < 0) throw new Error(`Expected JSON from wrangler, got: ${output.slice(0, 200)}`);
	return JSON.parse(output.slice(start));
}

/**
 * @param {string} root
 * @returns {Promise<{ loggedIn: boolean, email?: string, accounts: { id: string, name: string }[] }>}
 */
export async function whoami(root) {
	try {
		return parseJsonOutput(await runWrangler(root, ["whoami", "--json"], { json: true }));
	} catch {
		return { loggedIn: false, accounts: [] };
	}
}

/**
 * Bearer token for the Cloudflare REST API (CLOUDFLARE_API_TOKEN or the `wrangler login` OAuth token).
 * @param {string} root
 */
export async function apiToken(root) {
	const result = parseJsonOutput(await runWrangler(root, ["auth", "token", "--json"], { json: true }));
	if (!result.token) throw new Error("Use CLOUDFLARE_API_TOKEN or `wrangler login`; API keys are not supported.");
	return /** @type {string} */ (result.token);
}
