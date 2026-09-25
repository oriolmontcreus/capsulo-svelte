// @ts-check
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";

import { openDatabase } from "../lib/d1.js";
import {
	PLACEHOLDER_D1_ID,
	PLACEHOLDER_KV_ID,
	WRANGLER_CONFIG,
	findProjectRoot,
	isRealD1Id,
	isRealKvId,
	readProjectConfig,
	readProjectState,
	replaceWranglerValue,
	updateProjectState,
} from "../lib/project.js";
import { parseJsonOutput, runWrangler, whoami } from "../lib/wrangler.js";
import { generatePassword } from "../password.js";
import { pullCommand } from "./pull.js";
import { insertUser, printCredentials, validateLogin } from "./users.js";

export const DEPLOY_HELP = `Create the Cloudflare resources, build and deploy. Safe to re-run.

Usage:
  capsulo deploy [--skip-build]

First run: logs in to Cloudflare, creates the D1 database and KV namespace, applies
migrations, deploys, creates the first editor and walks you through auto-publishing
(Workers Builds + Deploy Hook). Later runs just pull, build and deploy.`;

/** The free Workers plan allows 10 D1 databases per account. */
const FREE_D1_LIMIT = 10;
const CONFIG_ARGS = ["-c", WRANGLER_CONFIG];

/**
 * @param {string} root
 * @param {string} command
 * @param {string[]} args
 * @param {{ capture?: boolean }} [options]
 * @returns {Promise<string>}
 */
function run(root, command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: root,
			stdio: ["inherit", options.capture ? "pipe" : "inherit", "inherit"],
			shell: process.platform === "win32",
		});
		let stdout = "";
		child.stdout?.on("data", (chunk) => (stdout += chunk));
		child.on("error", reject);
		child.on("close", (code) =>
			code === 0 ? resolve(stdout) : reject(new Error(`${command} ${args.join(" ")} exited with code ${code}.`)),
		);
	});
}

/** @param {unknown} value */
function exitIfCancelled(value) {
	if (p.isCancel(value)) {
		p.cancel("Deploy cancelled.");
		process.exit(1);
	}
	return value;
}

/** @param {string} root */
async function ensureLogin(root) {
	let user = await whoami(root);
	if (!user.loggedIn) {
		p.log.step("Log in to Cloudflare (free account, no card needed). A browser window will open.");
		await runWrangler(root, ["login"]);
		user = await whoami(root);
		if (!user.loggedIn) throw new Error("Cloudflare login did not complete.");
	}

	const state = await readProjectState(root);
	let account = user.accounts.find((candidate) => candidate.id === state.accountId);
	if (!account && user.accounts.length === 1) account = user.accounts[0];
	if (!account) {
		const accountId = /** @type {string} */ (
			exitIfCancelled(
				await p.select({
					message: "Which Cloudflare account should host this project?",
					options: user.accounts.map((candidate) => ({ value: candidate.id, label: candidate.name })),
				}),
			)
		);
		account = user.accounts.find((candidate) => candidate.id === accountId);
	}
	if (!account) throw new Error("No Cloudflare account available.");

	await updateProjectState(root, { accountId: account.id });
	// Every wrangler call below targets this account without asking again.
	process.env.CLOUDFLARE_ACCOUNT_ID = account.id;
	p.log.info(`Cloudflare account: ${account.name}`);
	return account.id;
}

/** @param {string} root */
async function ensureResources(root) {
	const config = await readProjectConfig(root);

	if (!isRealD1Id(config.d1.database_id)) {
		const databases = parseJsonOutput(await runWrangler(root, ["d1", "list", "--json"], { capture: true }));
		let database = databases.find((/** @type {any} */ db) => db.name === config.d1.database_name);
		if (!database) {
			if (databases.length >= FREE_D1_LIMIT) {
				p.log.warn(
					`This account already has ${databases.length} D1 databases; the free plan allows ${FREE_D1_LIMIT}. ` +
						"Use another (free) Cloudflare account, remove unused databases, or upgrade to Workers Paid.",
				);
			}
			p.log.step(`Creating D1 database "${config.d1.database_name}"...`);
			await runWrangler(root, ["d1", "create", config.d1.database_name, "--update-config=false"], {
				capture: true,
			});
			const refreshed = parseJsonOutput(await runWrangler(root, ["d1", "list", "--json"], { capture: true }));
			database = refreshed.find((/** @type {any} */ db) => db.name === config.d1.database_name);
			if (!database) throw new Error(`D1 database "${config.d1.database_name}" was not created.`);
		}
		await replaceWranglerValue(root, "database_id", PLACEHOLDER_D1_ID, database.uuid);
		p.log.success(`D1 database ready (${database.uuid}).`);
	}

	if (!isRealKvId(config.uploads.id)) {
		const title = `${config.name}-uploads`;
		/** @returns {Promise<any[]>} */
		const listNamespaces = async () =>
			parseJsonOutput(await runWrangler(root, ["kv", "namespace", "list"], { capture: true }));
		let namespace = (await listNamespaces()).find((ns) => ns.title === title);
		if (!namespace) {
			p.log.step(`Creating KV namespace "${title}" for uploads...`);
			await runWrangler(root, ["kv", "namespace", "create", title, "--update-config=false"], { capture: true });
			namespace = (await listNamespaces()).find((ns) => ns.title === title);
			if (!namespace) throw new Error(`KV namespace "${title}" was not created.`);
		}
		await replaceWranglerValue(root, "id", PLACEHOLDER_KV_ID, namespace.id);
		p.log.success(`KV namespace ready (${namespace.id}).`);
	}

	p.log.step("Applying database migrations...");
	await runWrangler(root, ["d1", "migrations", "apply", "DB", "--remote", ...CONFIG_ARGS]);
}

/**
 * @param {string} root
 * @param {boolean} skipBuild
 */
async function buildAndDeploy(root, skipBuild) {
	if (!skipBuild) {
		await pullCommand([]);
		p.log.step("Building...");
		await run(root, "npx", ["--no-install", "astro", "build"]);
	}
	p.log.step("Deploying...");
	// Uses the config the Cloudflare adapter generated in dist/ (via .wrangler/deploy).
	const output = await runWrangler(root, ["deploy"], { capture: true });
	process.stdout.write(output);
	const siteUrl = output.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0];
	if (siteUrl) await updateProjectState(root, { siteUrl });
	return siteUrl ?? (await readProjectState(root)).siteUrl;
}

/** @param {string} root */
async function ensureFirstEditor(root) {
	const db = await openDatabase(root, { remote: true });
	try {
		const [{ count }] = await db.all("SELECT COUNT(*) AS count FROM users");
		if (Number(count) > 0) return;

		p.log.step("Create the first editor (your client). You can add more with `capsulo users add`.");
		const login = /** @type {string} */ (
			exitIfCancelled(
				await p.text({
					message: "Their email or a username",
					validate: (value) => {
						try {
							validateLogin(value ?? "");
						} catch (error) {
							return error instanceof Error ? error.message : String(error);
						}
					},
				}),
			)
		);
		const name = /** @type {string} */ (exitIfCancelled(await p.text({ message: "Their name (optional)" })));
		const password = generatePassword();
		await insertUser(db, { login, name: name || null, password });
		printCredentials(login.trim(), password);
	} finally {
		await db.close();
	}
}

/** @param {string} root */
async function ensureGitRemote(root) {
	const remote = await run(root, "git", ["remote", "get-url", "origin"], { capture: true }).catch(() => "");
	if (remote.trim()) return remote.trim();

	const hasGh = await run(root, "gh", ["--version"], { capture: true }).then(
		() => true,
		() => false,
	);
	if (!hasGh) {
		p.log.warn(
			"No git remote yet. Create a private GitHub repo and push this project (GitHub CLI: `gh repo create --private --source . --push`).",
		);
		return null;
	}

	const create = exitIfCancelled(
		await p.confirm({ message: "Create a private GitHub repository for this project and push it?" }),
	);
	if (!create) return null;
	const config = await readProjectConfig(root);
	await run(root, "gh", ["repo", "create", config.name, "--private", "--source", ".", "--push"]);
	return (await run(root, "git", ["remote", "get-url", "origin"], { capture: true })).trim();
}

/**
 * The deploy wrote resource ids (wrangler.jsonc) and the site URL (.capsulo/project.json);
 * CI builds need both, so offer to commit them.
 * @param {string} root
 */
async function commitDeployState(root) {
	const status = await run(root, "git", ["status", "--porcelain", "--", WRANGLER_CONFIG, ".capsulo/project.json"], {
		capture: true,
	}).catch(() => "");
	if (!status.trim()) return;

	const commit = exitIfCancelled(
		await p.confirm({ message: "Commit the deploy settings (wrangler.jsonc ids, .capsulo/project.json)?" }),
	);
	if (!commit) {
		p.log.warn("Commit wrangler.jsonc and .capsulo/project.json before connecting Workers Builds.");
		return;
	}
	await run(root, "git", ["add", WRANGLER_CONFIG, ".capsulo/project.json"]);
	await run(root, "git", ["commit", "-m", "chore: capsulo deploy settings"]);
	const remote = await run(root, "git", ["remote", "get-url", "origin"], { capture: true }).catch(() => "");
	if (remote.trim()) await run(root, "git", ["push"]).catch(() => p.log.warn("Push failed; push manually."));
}

/**
 * Workers Builds' repo connection and Deploy Hooks can only be created in the dashboard
 * for now (cloudflare/workers-sdk#12058), so this step is guided.
 * @param {string} root
 * @param {string} accountId
 */
async function ensureAutoPublish(root, accountId) {
	const secrets = parseJsonOutput(
		await runWrangler(root, ["secret", "list", ...CONFIG_ARGS, "--format", "json"], { capture: true }).catch(
			() => "[]",
		),
	);
	if (secrets.some((/** @type {any} */ secret) => secret.name === "DEPLOY_HOOK_URL")) return;

	const { name } = await readProjectConfig(root);
	p.note(
		[
			"So CMS commits publish on their own (about 1 minute of clicks, once per project):",
			`1. Open https://dash.cloudflare.com/${accountId}/workers/services/view/${name}/production/settings`,
			"2. Build > Connect: pick this GitHub repo, branch main.",
			"   Build command: pnpm run build    Deploy command: npx wrangler deploy",
			"3. Build > Deploy Hooks > Create (branch main), then copy the hook URL.",
		].join("\n"),
		"Auto-publish with Workers Builds",
	);
	const hookUrl = /** @type {string} */ (
		exitIfCancelled(
			await p.text({
				message: "Paste the Deploy Hook URL (leave empty to do this later)",
				validate: (value) =>
					!value || value.startsWith("https://api.cloudflare.com/") ? undefined : "That is not a Deploy Hook URL.",
			}),
		)
	);
	if (!hookUrl) {
		p.log.warn("Skipped. Until then, run `capsulo deploy` to publish CMS commits.");
		return;
	}
	await runWrangler(root, ["secret", "put", "DEPLOY_HOOK_URL", ...CONFIG_ARGS], { input: hookUrl.trim() });
	p.log.success("Auto-publish is on: each CMS commit rebuilds the site.");
}

/** @param {string[]} argv */
export async function deployCommand(argv) {
	const { values } = parseArgs({
		args: argv,
		options: { "skip-build": { type: "boolean" }, help: { type: "boolean", short: "h" } },
	});
	if (values.help) {
		console.log(DEPLOY_HELP);
		return;
	}

	const root = findProjectRoot();
	p.intro("capsulo deploy");
	const accountId = await ensureLogin(root);
	await ensureResources(root);
	const siteUrl = await buildAndDeploy(root, values["skip-build"] ?? false);
	await ensureFirstEditor(root);
	await ensureGitRemote(root);
	await commitDeployState(root);
	await ensureAutoPublish(root, accountId);
	p.outro(siteUrl ? `Live at ${siteUrl} (CMS: ${siteUrl}/admin)` : "Deployed.");
}
