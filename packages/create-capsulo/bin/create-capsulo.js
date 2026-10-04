#!/usr/bin/env node
// @ts-check
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";

const TEMPLATE_REPO = "oriolmontcreus/capsulo-svelte";
const TEMPLATE_REF = "main";
const CLI_VERSION = "^0.1.0";

/** The starter project inside the Capsulo repo. */
const TEMPLATE_DIR = path.join("templates", "starter");
/** Never copied from a local template checkout. */
const LOCAL_COPY_SKIP = new Set(["node_modules", "dist", ".wrangler", ".astro", ".dev.vars", ".env"]);

const HELP = `npm create capsulo@latest [directory] [-- --locales es,en --default-locale es]

Options:
  --locales <list>        Comma-separated locale codes (default: prompt)
  --default-locale <code>
  --admin-locale <en|es|fr>
                          Language of the CMS for your editors (default: prompt). Each editor
                          can still pick their own from the CMS.
  --storage <kv|r2>       Where uploaded files are stored (default: prompt, recommended kv)
  --eject / --no-eject    Copy Capsulo's admin code into src/capsulo/ to customize it, instead of
                          using it as a package (default: prompt, recommended no). Ejected projects
                          no longer get Capsulo updates by updating the package.
  --template <dir>        Use a local Capsulo checkout instead of GitHub (for Capsulo contributors)
  --no-install            Skip installing dependencies
  --no-git                Skip git init`;

/**
 * Package managers are `.cmd` shims on Windows and only start through a shell, which joins
 * arguments without quoting. So only they get one (their arguments have no spaces); git and
 * node run directly, which keeps a commit message in one piece.
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
function run(command, args, cwd) {
	const needsShell = process.platform === "win32" && ["npm", "pnpm", "yarn", "bun"].includes(command);
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { cwd, stdio: "inherit", shell: needsShell });
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
 * Copies `templates/starter` from a local Capsulo checkout, or from the repo on GitHub.
 * @param {string} target
 * @param {string | undefined} localTemplate
 */
async function copyTemplate(target, localTemplate) {
	await mkdir(target, { recursive: true });
	/** @param {string} source */
	const copyStarter = (source) =>
		cp(source, target, {
			recursive: true,
			filter: (file) => !LOCAL_COPY_SKIP.has(path.relative(source, file).split(path.sep)[0]),
		});

	if (localTemplate) {
		await copyStarter(path.resolve(localTemplate, TEMPLATE_DIR));
		return;
	}

	const url = `https://codeload.github.com/${TEMPLATE_REPO}/tar.gz/${TEMPLATE_REF}`;
	const response = await fetch(url);
	if (!response.ok || !response.body) throw new Error(`Downloading the template failed (${response.status}).`);
	const download = await mkdtemp(path.join(os.tmpdir(), "create-capsulo-"));
	try {
		await new Promise((resolve, reject) => {
			const tar = spawn("tar", ["-xz", "--strip-components=1", "-C", download], { stdio: ["pipe", "inherit", "inherit"] });
			tar.on("error", reject);
			tar.on("close", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`tar exited with code ${code}.`))));
			Readable.fromWeb(/** @type {any} */ (response.body)).pipe(tar.stdin);
		});
		await copyStarter(path.join(download, TEMPLATE_DIR));
	} finally {
		await rm(download, { recursive: true, force: true });
	}
}

/** @type {Record<"kv" | "r2", { label: string, hint: string }>} */
const STORAGE_OPTIONS = {
	kv: { label: "Workers KV (recommended)", hint: "free, no card needed, files up to 25 MB" },
	r2: { label: "R2", hint: "files up to 100 MB and 10 GB free, but Cloudflare asks for a card to enable it" },
};

/** Languages the CMS itself is translated into (`admin.locale` in capsulo.config.ts). */
const ADMIN_LOCALES = { en: "English", es: "Español", fr: "Français" };

/** @param {string} value */
function isAdminLocale(value) {
	return Object.hasOwn(ADMIN_LOCALES, value);
}

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
 * @param {{ slug: string, locales: string[], defaultLocale: string, adminLocale: string, cliSpec: string, storage: "kv" | "r2", eject: boolean }} options
 */
async function personalize(target, { slug, locales, defaultLocale, adminLocale, cliSpec, storage, eject }) {
	const packageFile = path.join(target, "package.json");
	const pkg = JSON.parse(await readFile(packageFile, "utf8"));
	pkg.name = slug;
	pkg.version = "0.0.1";
	pkg.private = true;
	// The admin, the API and the CLI all come from the capsulo package.
	pkg.dependencies = { ...pkg.dependencies, capsulo: cliSpec };
	await writeFile(packageFile, `${JSON.stringify(pkg, null, 2)}\n`);

	const wranglerFile = path.join(target, "wrangler.jsonc");
	const wrangler = (await readFile(wranglerFile, "utf8"))
		.replace(/("name"\s*:\s*)"[^"]*"/, `$1"${slug}"`)
		.replace(/("database_name"\s*:\s*)"[^"]*"/, `$1"${slug}-db"`)
		.replace(/("database_id"\s*:\s*)"[^"]*"/, `$1"00000000-0000-0000-0000-000000000000"`)
		.replace(/("binding"\s*:\s*"UPLOADS",\s*"id"\s*:\s*)"[^"]*"/, `$1"00000000000000000000000000000000"`);
	await writeFile(wranglerFile, storage === "r2" ? useR2Storage(wrangler, slug) : wrangler);

	await writeFile(
		path.join(target, "capsulo.config.ts"),
		`import { defineCapsuloConfig } from "capsulo/config";

export default defineCapsuloConfig({
	i18n: {
		locales: ${JSON.stringify(locales)},
		defaultLocale: ${JSON.stringify(defaultLocale)},
		prefixDefaultLocale: ${locales.length > 1}
	},
	// Language of the CMS for editors who haven't picked their own ("en", "es" or "fr").
	admin: {
		locale: ${JSON.stringify(adminLocale)}
	}
});
`,
	);

	await writeFile(
		path.join(target, "README.md"),
		`# ${slug}

A [Capsulo](https://github.com/${TEMPLATE_REPO}) site with its CMS.

- \`${detectPackageManager()} run dev\`: site at http://localhost:4321, CMS at http://localhost:4321/admin (signed in automatically in dev)
- \`npx capsulo deploy\`: deploy to Cloudflare (free plan; first run sets everything up)
- \`npx capsulo users add client@example.com --name "Client"\`: give someone access to the CMS
- Uploaded files are stored in ${storage === "r2" ? "R2" : "Workers KV (files up to 25 MB). \`npx capsulo storage r2\` moves them to R2 for bigger files"}.
- ${
			eject
				? "Capsulo's admin is ejected into `src/capsulo/`: edit it freely, but Capsulo updates have to be merged by hand."
				: `Update the admin and CMS with \`${detectPackageManager()} update capsulo\`, then deploy. \`npx capsulo eject\` copies the admin into \`src/capsulo/\` if you ever need to customize it (no more automatic updates after that).`
		}
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
			"admin-locale": { type: "string" },
			storage: { type: "string" },
			template: { type: "string" },
			eject: { type: "boolean" },
			"no-eject": { type: "boolean" },
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

	const adminLocaleFlag = values["admin-locale"];
	if (adminLocaleFlag !== undefined && !isAdminLocale(adminLocaleFlag)) {
		throw new Error(`--admin-locale must be one of: ${Object.keys(ADMIN_LOCALES).join(", ")}.`);
	}
	const siteLanguage = defaultLocale.split("-")[0];
	const adminLocale = /** @type {string} */ (
		adminLocaleFlag ??
			exitIfCancelled(
				await p.select({
					message: "CMS language for your editors (each editor can change it later)",
					initialValue: isAdminLocale(siteLanguage) ? siteLanguage : "en",
					options: Object.entries(ADMIN_LOCALES).map(([value, label]) => ({ value, label })),
				}),
			)
	);

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

	if (values.eject && values["no-eject"]) throw new Error("Pass --eject or --no-eject, not both.");
	const eject = values.eject
		? true
		: values["no-eject"]
			? false
			: /** @type {boolean} */ (
					exitIfCancelled(
						await p.confirm({
							message:
								"Eject Capsulo's admin code into src/capsulo/? You could edit it, but you'd lose one-command updates (`npx capsulo eject` can also do this later)",
							initialValue: false,
						}),
					)
				);
	if (eject && values["no-install"]) {
		throw new Error("--eject needs the dependencies installed. Drop --no-install, or run `npx capsulo eject` after installing.");
	}

	// Contributors: the project uses the checkout's packages/capsulo, whose integration must be built.
	const localPackage = values.template ? path.resolve(values.template, "packages", "capsulo") : undefined;
	if (localPackage && !existsSync(path.join(localPackage, "dist", "astro.js"))) {
		throw new Error(`Build the local capsulo package first: pnpm --dir ${localPackage} build`);
	}

	const spinner = p.spinner();
	spinner.start(values.template ? "Copying the template" : "Downloading the template");
	await copyTemplate(target, values.template);
	const cliSpec = localPackage ? `file:${localPackage}` : CLI_VERSION;
	await personalize(target, { slug, locales, defaultLocale, adminLocale, cliSpec, storage, eject });
	spinner.stop("Project created.");

	const packageManager = detectPackageManager();
	if (!values["no-install"]) {
		p.log.step(`Installing dependencies with ${packageManager}...`);
		await run(packageManager, ["install"], target);
	}
	if (eject) {
		// The installed CLI copies its own framework source, so the copy matches the installed version.
		await run(process.execPath, [path.join("node_modules", "capsulo", "bin", "capsulo.js"), "eject", "--yes"], target);
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
			...(eject ? [] : [`${packageManager} update capsulo  # later: the newest admin and CMS`]),
		].join("\n"),
		"Next steps",
	);
	p.outro("Happy building!");
}

main().catch((error) => {
	p.log.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
