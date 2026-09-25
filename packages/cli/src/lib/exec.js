// @ts-check
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * Child processes never go through a shell: on Windows `shell: true` joins arguments
 * without quoting (a commit message like "chore: deploy settings" splits into paths)
 * and is deprecated (DEP0190). Node CLIs (wrangler, astro) are run as
 * `node <their bin.js>`, so no `.cmd` shim is involved either.
 */

let verbose = false;

/**
 * `--verbose`: also stream every child's output to the terminal.
 * @param {boolean} value
 */
export function setVerbose(value) {
	verbose = value;
}

export function isVerbose() {
	return verbose;
}

/** Thrown when a child exits non-zero; `log` holds its captured output. */
export class ExecError extends Error {
	/**
	 * @param {string} message
	 * @param {string} log
	 */
	constructor(message, log) {
		super(message);
		this.log = log;
	}
}

/**
 * @typedef {{
 *   cwd: string,
 *   mode?: "inherit" | "quiet" | "json",
 *   input?: string,
 *   label?: string,
 * }} ExecOptions
 * - inherit: the child owns the terminal (interactive commands like `wrangler login`).
 * - quiet:   output is captured and only shown if the command fails (also streamed with --verbose).
 * - json:    like quiet, but stdout is never echoed because the caller parses it.
 */

/**
 * @param {string} command
 * @param {string[]} args
 * @param {ExecOptions} options
 * @returns {Promise<{ stdout: string, log: string }>}
 */
export function exec(command, args, { cwd, mode = "quiet", input, label = path.basename(command) }) {
	const interactive = mode === "inherit";
	/** @type {import("node:child_process").StdioOptions} */
	const stdio = interactive
		? [input !== undefined ? "pipe" : "inherit", "inherit", "inherit"]
		: [input !== undefined ? "pipe" : "ignore", "pipe", "pipe"];

	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio,
			env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
		});
		let stdout = "";
		let log = "";
		child.stdout?.on("data", (chunk) => {
			stdout += chunk;
			log += chunk;
			if (verbose && mode === "quiet") process.stdout.write(chunk);
		});
		child.stderr?.on("data", (chunk) => {
			log += chunk;
			if (verbose) process.stderr.write(chunk);
		});
		if (input !== undefined) child.stdin?.end(input);
		child.on("error", (error) => reject(new ExecError(`Could not run ${command}: ${error.message}`, log)));
		child.on("close", (code) => {
			if (code === 0) resolve({ stdout, log });
			else reject(new ExecError(`${[label, ...args].join(" ")} exited with code ${code}.`, log));
		});
	});
}

/**
 * Absolute path of a package's bin script, resolved from the project (so the project's
 * own wrangler/astro versions are used).
 * @param {string} root
 * @param {string} packageName
 * @param {string} binName
 */
function resolveBin(root, packageName, binName) {
	const require = createRequire(path.join(root, "package.json"));
	let dir = path.dirname(require.resolve(packageName));
	while (!existsSync(path.join(dir, "package.json")) || readPackageName(dir) !== packageName) {
		const parent = path.dirname(dir);
		if (parent === dir) throw new Error(`Could not locate the ${packageName} package.`);
		dir = parent;
	}
	const { bin } = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
	const relative = typeof bin === "string" ? bin : bin?.[binName];
	if (!relative) throw new Error(`${packageName} has no "${binName}" executable.`);
	return path.join(dir, relative);
}

/** @param {string} dir */
function readPackageName(dir) {
	try {
		return JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")).name;
	} catch {
		return undefined;
	}
}

/**
 * Runs a Node CLI from the project's dependencies: `node <bin> ...args`.
 * @param {string} root
 * @param {string} packageName
 * @param {string} binName
 * @param {string[]} args
 * @param {Omit<ExecOptions, "cwd">} [options]
 */
export function execNodeBin(root, packageName, binName, args, options = {}) {
	const bin = resolveBin(root, packageName, binName);
	// The bin path is argv[0] for node; keep it out of error messages.
	return exec(process.execPath, [bin, ...args], { cwd: root, label: binName, ...options }).catch((error) => {
		if (error instanceof ExecError) error.message = error.message.replace(` ${bin}`, "");
		throw error;
	});
}

/**
 * Last lines of a failed command's output, for the error report.
 * @param {string} log
 * @param {number} [lines]
 */
export function tail(log, lines = 40) {
	return log.trimEnd().split(/\r?\n/).slice(-lines).join("\n");
}
