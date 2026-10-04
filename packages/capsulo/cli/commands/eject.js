// @ts-check
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";

import { exec } from "../lib/exec.js";
import { WRANGLER_CONFIG, findProjectRoot, readProjectState, replaceWranglerValue, updateProjectState } from "../lib/project.js";

export const EJECT_HELP = `Copy Capsulo's admin, API routes and integration into src/capsulo/ so you can edit them.

Usage:
  capsulo eject [options]

Options:
  -y, --yes      Don't ask for confirmation
  --no-install   Don't install the dependencies the ejected code needs

This can't be undone automatically: after ejecting, updating the capsulo package no
longer updates your admin panel. New Capsulo versions have to be merged by hand.`;

/** The package's framework source: exactly what gets copied. */
const PACKAGE_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FRAMEWORK_SRC = path.join(PACKAGE_ROOT, "src");
/** Where the copy goes, relative to the project root (also how it reads in messages). */
const EJECT_DIR = "src/capsulo";
const PACKAGE_MIGRATIONS = "node_modules/capsulo/src/migrations";

/** `capsulo/<entry>` imports in site files and the file each one points to once ejected. */
const ENTRY_TARGETS = /** @type {const} */ ({
	astro: "integration/index.ts",
	config: "config.js",
	schema: "schema.ts",
	runtime: "runtime.ts"
});
const SITE_FILE = /\.(?:[cm]?[jt]s|astro|svelte)$/;
const SITE_IMPORT = /(["'])capsulo\/(astro|config|schema|runtime|components\/[^"']+)\1/g;

/**
 * @param {string} from directory of the importing file
 * @param {string} target absolute path
 */
function relativeSpecifier(from, target) {
	const relative = path.relative(from, target).split(path.sep).join("/");
	return relative.startsWith(".") ? relative : `./${relative}`;
}

/**
 * Rewrites `capsulo/...` imports to the ejected copy. Config files keep the `.ts`
 * extension (astro.config is loaded outside Vite's resolver); other files drop it.
 * @param {string} file
 * @param {string} ejectRoot
 */
async function rewriteSiteImports(file, ejectRoot) {
	const source = await readFile(file, "utf8");
	const isConfig = /(?:^|[\\/])(?:astro|capsulo)\.config\.[cm]?[jt]s$/.test(file);
	const next = source.replace(SITE_IMPORT, (_, quote, entry) => {
		const target = entry.startsWith("components/")
			? path.join(ejectRoot, entry)
			: path.join(ejectRoot, ENTRY_TARGETS[/** @type {keyof typeof ENTRY_TARGETS} */ (entry)]);
		let specifier = relativeSpecifier(path.dirname(file), target);
		if (!isConfig) specifier = specifier.replace(/\.ts$/, "");
		return `${quote}${specifier}${quote}`;
	});
	if (next === source) return false;
	await writeFile(file, next);
	return true;
}

/**
 * @param {string} dir
 * @param {string} skip
 * @returns {Promise<string[]>}
 */
async function listSiteFiles(dir, skip) {
	if (!existsSync(dir)) return [];
	/** @type {string[]} */
	const files = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (full === skip) continue;
		if (entry.isDirectory()) files.push(...(await listSiteFiles(full, skip)));
		else if (SITE_FILE.test(entry.name)) files.push(full);
	}
	return files;
}

/** @param {string} root */
function detectPackageManager(root) {
	if (existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
	if (existsSync(path.join(root, "yarn.lock"))) return "yarn";
	if (existsSync(path.join(root, "bun.lock")) || existsSync(path.join(root, "bun.lockb"))) return "bun";
	return "npm";
}

/**
 * Package managers are `.cmd` shims on Windows, which only start through a shell. The
 * arguments are fixed, so the shell can't split anything it shouldn't.
 * @param {string} command
 * @param {string} cwd
 */
function install(command, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, ["install"], { cwd, stdio: "inherit", shell: process.platform === "win32" });
		child.on("error", reject);
		child.on("close", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`${command} install exited with code ${code}.`))));
	});
}

/** @param {string} root */
async function isGitDirty(root) {
	try {
		const { stdout } = await exec("git", ["status", "--porcelain"], { cwd: root, mode: "json" });
		return stdout.trim().length > 0;
	} catch {
		return false; // Not a git repository, or git isn't installed.
	}
}

/** @param {string[]} argv */
export async function ejectCommand(argv) {
	const { values } = parseArgs({
		args: argv,
		options: {
			yes: { type: "boolean", short: "y" },
			"no-install": { type: "boolean" },
			help: { type: "boolean", short: "h" }
		}
	});
	if (values.help) {
		console.log(EJECT_HELP);
		return;
	}

	const root = findProjectRoot();
	const ejectRoot = path.join(root, EJECT_DIR);
	const state = await readProjectState(root);
	if (state.ejected || existsSync(ejectRoot)) {
		throw new Error(`Capsulo is already ejected into ${EJECT_DIR}${state.ejected ? ` (v${state.ejected.version})` : ""}.`);
	}

	const capsuloPkg = JSON.parse(await readFile(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
	const version = /** @type {string} */ (capsuloPkg.version);

	p.intro("capsulo eject");
	if (await isGitDirty(root)) {
		p.log.warn("You have uncommitted changes. Commit them first so the eject is easy to review or undo.");
	}
	if (!values.yes) {
		p.note(
			[
				`This copies Capsulo's admin, API routes and integration into ${EJECT_DIR}/ so you`,
				"can edit them.",
				"",
				"After ejecting, updating the capsulo package will NO LONGER update your admin",
				"panel: new Capsulo versions have to be merged into your copy by hand.",
				`The capsulo CLI (deploy, users, pull) stays installed, pinned to v${version}.`
			].join("\n"),
			"Before you eject"
		);
		const confirmed = await p.confirm({ message: "Eject Capsulo into this project?", initialValue: false });
		if (p.isCancel(confirmed) || !confirmed) {
			p.cancel("Nothing changed.");
			return;
		}
	}

	await cp(FRAMEWORK_SRC, ejectRoot, { recursive: true });
	p.log.step(`Copied Capsulo v${version} into ${EJECT_DIR}/`);

	const candidates = [
		...["astro.config.mjs", "astro.config.ts", "astro.config.js", "capsulo.config.ts", "capsulo.config.js"].map((file) =>
			path.join(root, file)
		),
		...(await listSiteFiles(path.join(root, "src"), ejectRoot))
	].filter((file) => existsSync(file));
	const rewritten = [];
	for (const file of candidates) {
		if (await rewriteSiteImports(file, ejectRoot)) rewritten.push(path.relative(root, file).split(path.sep).join("/"));
	}
	if (rewritten.length > 0) {
		p.log.step(`Pointed capsulo/* imports at ${EJECT_DIR}/ in:\n${rewritten.map((file) => `  ${file}`).join("\n")}`);
	}

	try {
		await replaceWranglerValue(root, "migrations_dir", PACKAGE_MIGRATIONS, `${EJECT_DIR}/migrations`);
		p.log.step(`${WRANGLER_CONFIG}: database migrations now come from ${EJECT_DIR}/migrations`);
	} catch {
		p.log.warn(`Point "migrations_dir" in ${WRANGLER_CONFIG} at ${EJECT_DIR}/migrations yourself.`);
	}

	// Keep the site's Tailwind from scanning the admin's files (the admin has its own CSS).
	const siteCss = path.join(root, "src", "styles", "global.css");
	if (existsSync(siteCss)) {
		const css = await readFile(siteCss, "utf8");
		if (/@import\s+["']tailwindcss["']/.test(css) && !css.includes('@source not "../capsulo"')) {
			await writeFile(siteCss, css.replace(/(@import\s+["']tailwindcss["'][^;]*;)/, `$1\n@source not "../capsulo";`));
		}
	}

	const packageFile = path.join(root, "package.json");
	const pkg = JSON.parse(await readFile(packageFile, "utf8"));
	// The ejected code imports these itself now, and the CLI's SQL must match the ejected schema.
	const dependencies = { ...capsuloPkg.dependencies, ...pkg.dependencies };
	const current = dependencies.capsulo ?? pkg.devDependencies?.capsulo;
	const pin = typeof current === "string" && /^[\^~]?\d/.test(current);
	if (pin) dependencies.capsulo = version;
	pkg.dependencies = Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)));
	await writeFile(packageFile, `${JSON.stringify(pkg, null, 2)}\n`);
	p.log.step(`package.json: added the admin's dependencies${pin ? ` and pinned capsulo to ${version}` : ""}`);

	await updateProjectState(root, { ejected: { version, at: new Date().toISOString() } });

	if (!values["no-install"]) {
		const packageManager = detectPackageManager(root);
		p.log.step(`Installing dependencies with ${packageManager}...`);
		await install(packageManager, root);
	}

	p.outro(`Ejected. Capsulo now lives in ${EJECT_DIR}/ and is yours to edit.`);
}
