#!/usr/bin/env node
// @ts-check
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";

const TEMPLATE_REPO = "oriolmontcreus/capsulo-svelte";
const TEMPLATE_REF = "main";
const CLI_VERSION = "^0.1.0";

/** Framework-repo files that don't belong in a client project. */
const TEMPLATE_ONLY = [
	".git",
	".cursor",
	".fallowrc.json",
	"packages",
	"docs",
	"DESIGN.md",
	"capsulo-overview.md",
	"capsulo-systems-and-architecture.md",
	"i18n-and-capsulo-config.md",
	"scripts/capsulo-sync.sh",
	"scripts/export_bundle.sh",
	"scripts/restore_bundle.sh",
	"src/pages/colorpicker-tests.astro",
	"src/pages/file-upload-tests.astro",
	"src/pages/select-tests.astro",
];
/** Never copied from a local template checkout. */
const LOCAL_COPY_SKIP = new Set(["node_modules", "dist", ".wrangler", ".astro", ".dev.vars", ".env"]);

const HELP = `npm create capsulo@latest [directory] [-- --locales es,en --default-locale es]

Options:
  --locales <list>        Comma-separated locale codes (default: prompt)
  --default-locale <code>
  --storage <kv|r2>       Where uploaded files are stored (default: prompt, recommended kv)
  --template <dir>        Use a local Capsulo checkout instead of GitHub (for Capsulo contributors)
  --no-install            Skip installing dependencies
  --no-git                Skip git init`;

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
function run(command, args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
		child.on("error", reject);
		child.on("close", (code) =>
			code === 0 ? resolve(undefined) : reject(new Error(`${command} ${args.join(" ")} exited with code ${code}.`)),
		);
	});
}

/** @param {unknown} value */
function exitIfCancelled(value) {
	if (p.isCancel(value)) {
		p.cancel("Cancelled.");
		process.exit(1);
	}
	return value;
}

/** Worker names become `<name>.<account>.workers.dev`, so keep them DNS-safe. */
/** @param {string} value */
function toSlug(value) {
	return path
		.basename(value)
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 54);
}

/** @param {string} value */
function parseLocales(value) {
	const locales = [...new Set(value.split(",").map((locale) => locale.trim()).filter(Boolean))];
	const invalid = locales.find((locale) => !/^[a-z]{2}(-[A-Z]{2})?$/.test(locale));
	if (invalid) throw new Error(`"${invalid}" is not a locale code like "en" or "pt-BR".`);
	if (locales.length === 0) throw new Error("Pick at least one locale.");
	return locales;
}

function detectPackageManager() {
	const agent = process.env.npm_config_user_agent ?? "";
	if (agent.startsWith("pnpm")) return "pnpm";
	if (agent.startsWith("yarn")) return "yarn";
	if (agent.startsWith("bun")) return "bun";
	return "npm";
}

/**
 * @param {string} target
 * @param {string | undefined} localTemplate
 */
async function copyTemplate(target, localTemplate) {
	await mkdir(target, { recursive: true });
	if (localTemplate) {
		const source = path.resolve(localTemplate);
		await cp(source, target, {
			recursive: true,
			filter: (file) => {
				const relative = path.relative(source, file);
				const [first] = relative.split(path.sep);
				if (LOCAL_COPY_SKIP.has(first)) return false;
				return !relative.startsWith(path.join(".capsulo", "published")) && !relative.startsWith(path.join("public", "uploads"));
			},
		});
		return;
	}

	const url = `https://codeload.github.com/${TEMPLATE_REPO}/tar.gz/${TEMPLATE_REF}`;
	const response = await fetch(url);
	if (!response.ok || !response.body) throw new Error(`Downloading the template failed (${response.status}).`);
	await new Promise((resolve, reject) => {
		const tar = spawn("tar", ["-xz", "--strip-components=1", "-C", target], { stdio: ["pipe", "inherit", "inherit"] });
		tar.on("error", reject);
		tar.on("close", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`tar exited with code ${code}.`))));
		Readable.fromWeb(/** @type {any} */ (response.body)).pipe(tar.stdin);
	});
}

/** @type {Record<"kv" | "r2", { label: string, hint: string }>} */
const STORAGE_OPTIONS = {
	kv: { label: "Workers KV (recommended)", hint: "free, no card needed, files up to 25 MB" },
	r2: { label: "R2", hint: "files up to 100 MB and 10 GB free, but Cloudflare asks for a card to enable it" },
};

/**
 * Swaps the template's KV upload binding for an R2 bucket.
 * @param {string} wrangler wrangler.jsonc source
 * @param {string} slug
 */
function useR2Storage(wrangler, slug) {
	const kvBlock = /("kv_namespaces"\s*:\s*\[)[\s\S]*?"binding"\s*:\s*"UPLOADS"[\s\S]*?\]/;
	if (!kvBlock.test(wrangler)) throw new Error("Could not find the UPLOADS binding in wrangler.jsonc.");
	return wrangler.replace(
		kvBlock,
		`"r2_buckets": [\n\t\t{\n\t\t\t"binding": "UPLOADS_BUCKET",\n\t\t\t"bucket_name": "${slug}-uploads"\n\t\t}\n\t]`,
	);
}

/**
 * @param {string} target
 * @param {{ slug: string, locales: string[], defaultLocale: string, cliSpec: string, storage: "kv" | "r2" }} options
 */
async function personalize(target, { slug, locales, defaultLocale, cliSpec, storage }) {
	await Promise.all(TEMPLATE_ONLY.map((entry) => rm(path.join(target, entry), { recursive: true, force: true })));

	const packageFile = path.join(target, "package.json");
	const pkg = JSON.parse(await readFile(packageFile, "utf8"));
	pkg.name = slug;
	pkg.version = "0.0.1";
	pkg.private = true;
	// The app imports `capsulo/password` (login form + Worker), so it is a runtime dependency.
	pkg.dependencies = { ...pkg.dependencies, capsulo: cliSpec };
	await writeFile(packageFile, `${JSON.stringify(pkg, null, 2)}\n`);

	// The template repo is a workspace (it hosts this CLI); a client project is not.
	const workspaceFile = path.join(target, "pnpm-workspace.yaml");
	if (existsSync(workspaceFile)) {
		const workspace = await readFile(workspaceFile, "utf8");
		await writeFile(workspaceFile, workspace.replace(/^packages:\n(?:\s+- .*\n)+\n?/m, ""));
	}

	const wranglerFile = path.join(target, "wrangler.jsonc");
	const wrangler = (await readFile(wranglerFile, "utf8"))
		.replace(/("name"\s*:\s*)"[^"]*"/, `$1"${slug}"`)
		.replace(/("database_name"\s*:\s*)"[^"]*"/, `$1"${slug}-db"`)
		.replace(/("database_id"\s*:\s*)"[^"]*"/, `$1"00000000-0000-0000-0000-000000000000"`)
		.replace(/("binding"\s*:\s*"UPLOADS",\s*"id"\s*:\s*)"[^"]*"/, `$1"00000000000000000000000000000000"`);
	await writeFile(wranglerFile, storage === "r2" ? useR2Storage(wrangler, slug) : wrangler);

	await writeFile(
		path.join(target, "capsulo.config.ts"),
		`import { defineCapsuloConfig } from "./src/lib/config/define-config";

export default defineCapsuloConfig({
	i18n: {
		locales: ${JSON.stringify(locales)},
		defaultLocale: ${JSON.stringify(defaultLocale)},
		prefixDefaultLocale: ${locales.length > 1}
	}
});
`,
	);

	await rm(path.join(target, ".capsulo", "project.json"), { force: true });
	await writeFile(
		path.join(target, "README.md"),
		`# ${slug}

A [Capsulo](https://github.com/${TEMPLATE_REPO}) site with its CMS.

- \`${detectPackageManager()} run dev\`: site at http://localhost:4321, CMS at http://localhost:4321/admin (signed in automatically in dev)
- \`npx capsulo deploy\`: deploy to Cloudflare (free plan; first run sets everything up)
- \`npx capsulo users add client@example.com --name "Client"\`: give someone access to the CMS
- Uploaded files are stored in ${storage === "r2" ? "R2" : "Workers KV (files up to 25 MB). \`npx capsulo storage r2\` moves them to R2 for bigger files"}.
`,
	);
}

async function main() {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		allowPositionals: true,
		options: {
			locales: { type: "string" },
			"default-locale": { type: "string" },
			storage: { type: "string" },
			template: { type: "string" },
			"no-install": { type: "boolean" },
			"no-git": { type: "boolean" },
			help: { type: "boolean", short: "h" },
		},
	});
	if (values.help) {
		console.log(HELP);
		return;
	}

	p.intro("create-capsulo");

	const directory = /** @type {string} */ (
		positionals[0] ??
			exitIfCancelled(
				await p.text({
					message: "Project directory",
					placeholder: "my-client-site",
					validate: (value) => (toSlug(value ?? "") ? undefined : "Use letters, numbers or dashes."),
				}),
			)
	);
	const target = path.resolve(directory);
	const slug = toSlug(directory);
	if (!slug) throw new Error("Use letters, numbers or dashes in the directory name.");
	if (existsSync(target) && (await readdir(target)).length > 0) {
		throw new Error(`${directory} already exists and is not empty.`);
	}

	const locales = parseLocales(
		values.locales ??
			/** @type {string} */ (
				exitIfCancelled(
					await p.text({
						message: "Site languages (comma-separated locale codes)",
						initialValue: "en",
						validate: (value) => {
							try {
								parseLocales(value ?? "");
							} catch (error) {
								return error instanceof Error ? error.message : String(error);
							}
						},
					}),
				)
			),
	);
	const defaultLocale =
		values["default-locale"] ??
		(locales.length === 1
			? locales[0]
			: /** @type {string} */ (
					exitIfCancelled(
						await p.select({
							message: "Default language",
							options: locales.map((locale) => ({ value: locale, label: locale })),
						}),
					)
				));
	if (!locales.includes(defaultLocale)) throw new Error(`The default locale must be one of: ${locales.join(", ")}.`);

	if (values.storage !== undefined && values.storage !== "kv" && values.storage !== "r2") {
		throw new Error(`--storage must be "kv" or "r2", not "${values.storage}".`);
	}
	const storage = /** @type {"kv" | "r2"} */ (
		values.storage ??
			exitIfCancelled(
				await p.select({
					message: "Where should uploaded files be stored?",
					initialValue: "kv",
					options: Object.entries(STORAGE_OPTIONS).map(([value, option]) => ({ value, ...option })),
				}),
			)
	);

	const spinner = p.spinner();
	spinner.start(values.template ? "Copying the template" : "Downloading the template");
	await copyTemplate(target, values.template);
	const cliSpec = values.template ? `file:${path.resolve(values.template, "packages", "cli")}` : CLI_VERSION;
	await personalize(target, { slug, locales, defaultLocale, cliSpec, storage });
	spinner.stop("Project created.");

	const packageManager = detectPackageManager();
	if (!values["no-install"]) {
		p.log.step(`Installing dependencies with ${packageManager}...`);
		await run(packageManager, ["install"], target);
	}
	if (!values["no-git"]) {
		await run("git", ["init", "-q"], target);
		await run("git", ["add", "-A"], target);
		await run("git", ["commit", "-q", "-m", "Initial commit from create-capsulo"], target).catch(() =>
			p.log.warn("Could not create the first commit (is git user.name/email set?)."),
		);
	}

	const runScript = packageManager === "npm" ? "npm run" : packageManager;
	p.note(
		[
			`cd ${path.relative(process.cwd(), target) || "."}`,
			`${runScript} dev          # site + CMS at http://localhost:4321/admin`,
			"npx capsulo deploy     # when you're ready: free Cloudflare hosting",
		].join("\n"),
		"Next steps",
	);
	p.outro("Happy building!");
}

main().catch((error) => {
	p.log.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
