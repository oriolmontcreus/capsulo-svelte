// @ts-check
import { spawn } from "node:child_process";

/**
 * Runs the project's wrangler. `capture` collects stdout (stderr still streams to the terminal).
 * @param {string} root
 * @param {string[]} args
 * @param {{ capture?: boolean, input?: string }} [options]
 * @returns {Promise<string>}
 */
export function runWrangler(root, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn("npx", ["--no-install", "wrangler", ...args], {
			cwd: root,
			// Captured runs get no terminal input, so wrangler never waits on a prompt nobody sees.
			stdio: [options.input !== undefined ? "pipe" : options.capture ? "ignore" : "inherit", options.capture ? "pipe" : "inherit", "inherit"],
			shell: process.platform === "win32",
			env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
		});
		let stdout = "";
		child.stdout?.on("data", (chunk) => (stdout += chunk));
		if (options.input !== undefined) child.stdin?.end(options.input);
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve(stdout);
			else reject(new Error(`wrangler ${args.join(" ")} exited with code ${code}.`));
		});
	});
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
		return parseJsonOutput(await runWrangler(root, ["whoami", "--json"], { capture: true }));
	} catch {
		return { loggedIn: false, accounts: [] };
	}
}

/**
 * Bearer token for the Cloudflare REST API (CLOUDFLARE_API_TOKEN or the `wrangler login` OAuth token).
 * @param {string} root
 */
export async function apiToken(root) {
	const result = parseJsonOutput(await runWrangler(root, ["auth", "token", "--json"], { capture: true }));
	if (!result.token) throw new Error("Use CLOUDFLARE_API_TOKEN or `wrangler login`; API keys are not supported.");
	return /** @type {string} */ (result.token);
}
