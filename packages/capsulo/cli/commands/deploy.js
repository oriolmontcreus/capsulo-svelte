// @ts-check
import { readdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";

import { openDatabase } from "../lib/d1.js";
import { exec, execNodeBin, isVerbose, setVerbose } from "../lib/exec.js";
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
import { ensureR2Bucket } from "../lib/r2.js";
import { parseJsonOutput, runWrangler, whoami } from "../lib/wrangler.js";
import { generatePassword } from "../password.js";
import { pullContent } from "./pull.js";
import { insertUser, printCredentials, validateLogin } from "./users.js";

export const DEPLOY_HELP = `Create the Cloudflare resources, build and deploy. Safe to re-run.

Usage:
  capsulo deploy [options]

Options:
  --db-name <name>   D1 database name for a new project (default: <project>-db)
  --kv-name <name>   KV namespace for uploads (default: <project>-uploads)
                     Projects that store uploads in R2 use the bucket named in wrangler.jsonc
  -y, --yes          Accept the recommended names and default answers
  --skip-build       Deploy the existing dist/ without pulling or building
  --verbose          Show the full output of wrangler and astro

First run: logs in to Cloudflare, creates the D1 database and the upload storage
(a KV namespace, or an R2 bucket if the project uses R2), applies
migrations, deploys, creates the first editor and walks you through auto-publishing
(Workers Builds + Deploy Hook). Later runs just pull, build and deploy.`;

/** The free Workers plan allows 10 D1 databases per account. */
const FREE_D1_LIMIT = 10;
const CONFIG_ARGS = ["-c", WRANGLER_CONFIG];
const RESOURCE_NAME = /^[a-z0-9][a-z0-9_-]{0,62}$/;
const DEPLOY_STATE_FILES = [WRANGLER_CONFIG, ".capsulo/project.json"];

/**
 * @template T
 * @param {T | symbol} value
 * @returns {T}
 */
function answer(value) {
	if (p.isCancel(value)) {
		p.cancel("Deploy cancelled.");
		process.exit(1);
	}
	return /** @type {T} */ (value);
}

/**
 * Runs a long step behind a spinner that ends in a one-line result. With --verbose the
 * step's own output is streamed instead.
 * @param {string} title
 * @param {() => Promise<string>} run returns the success line
 */
async function task(title, run) {
	if (isVerbose()) {
		p.log.step(title);
		p.log.success(await run());
		return;
	}
	const spinner = p.spinner();
	spinner.start(title);
	try {
		spinner.stop(await run());
	} catch (error) {
		spinner.error(`${title.replace(/\.\.\.$/, "")} failed`);
		throw error;
	}
}

/** @param {string | undefined} value */
function validateResourceName(value) {
	return RESOURCE_NAME.test(value ?? "")
		? undefined
		: "Use lowercase letters, numbers, dashes or underscores (max 63).";
}

/**
 * @param {string} root
 * @param {string[]} args
 */
function git(root, args) {
	return exec("git", args, { cwd: root, mode: "json" }).then(({ stdout }) => stdout.trim());
}

/** @param {string} root */
export async function ensureLogin(root) {
	let user = await whoami(root);
	if (!user.loggedIn) {
		p.log.step("Log in to Cloudflare (free account, no card needed). A browser window will open.");
		await runWrangler(root, ["login"], { interactive: true });
		user = await whoami(root);
		if (!user.loggedIn) throw new Error("Cloudflare login did not complete.");
	}

	const state = await readProjectState(root);
	let account = user.accounts.find((candidate) => candidate.id === state.accountId);
	if (!account && user.accounts.length === 1) account = user.accounts[0];
	if (!account) {
		const accountId = answer(
			await p.select({
				message: "Which Cloudflare account should host this project?",
				options: user.accounts.map((candidate) => ({ value: candidate.id, label: candidate.name })),
			}),
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
async function ensureAccountId(root) {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? (await readProjectState(root)).accountId;
	if (!accountId) throw new Error("No Cloudflare account selected.");
	return accountId;
}

/**
 * Names for the resources this project doesn't have yet: flags, then --yes/recommended,
 * then a prompt.
 * @param {{ needDb: boolean, needKv: boolean, dbDefault: string, kvDefault: string }} needs
 * @param {{ dbName?: string, kvName?: string, yes?: boolean }} flags
 */
async function chooseResourceNames({ needDb, needKv, dbDefault, kvDefault }, flags) {
	for (const [flag, value] of [
		["--db-name", flags.dbName],
		["--kv-name", flags.kvName],
	]) {
		const problem = value === undefined ? undefined : validateResourceName(value);
		if (problem) throw new Error(`${flag}: ${problem}`);
	}

	let dbName = flags.dbName ?? dbDefault;
	let kvName = flags.kvName ?? kvDefault;
	const needsPrompt = (needDb && !flags.dbName) || (needKv && !flags.kvName);
	if (!needsPrompt || flags.yes) return { dbName, kvName };

	const summary = [needDb && `${dbName} (database)`, needKv && `${kvName} (uploads)`].filter(Boolean).join(", ");
	const useRecommended = answer(await p.confirm({ message: `Use the recommended names? ${summary}` }));
	if (useRecommended) return { dbName, kvName };

	if (needDb && !flags.dbName) {
		dbName = answer(
			await p.text({ message: "D1 database name", initialValue: dbName, validate: validateResourceName }),
		);
	}
	if (needKv && !flags.kvName) {
		kvName = answer(
			await p.text({ message: "KV namespace name (uploads)", initialValue: kvName, validate: validateResourceName }),
		);
	}
	return { dbName, kvName };
}

/**
 * @param {string} root
 * @param {{ dbName?: string, kvName?: string, yes?: boolean }} flags
 */
async function ensureResources(root, flags) {
	const config = await readProjectConfig(root);
	const needDb = !isRealD1Id(config.d1.database_id);
	const needKv = Boolean(config.kv && !isRealKvId(config.kv.id));

	if (config.r2) {
		await ensureR2Bucket(root, {
			accountId: await ensureAccountId(root),
			bucketName: config.r2.bucket_name,
			yes: flags.yes ?? false,
		});
	}

	if (needDb || needKv) {
		const { dbName, kvName } = await chooseResourceNames(
			{ needDb, needKv, dbDefault: config.d1.database_name, kvDefault: `${config.name}-uploads` },
			flags,
		);

		if (needDb) {
			/** @returns {Promise<any[]>} */
			const listDatabases = async () => parseJsonOutput(await runWrangler(root, ["d1", "list", "--json"], { json: true }));
			const databases = await listDatabases();
			let database = databases.find((db) => db.name === dbName);
			if (database) {
				p.log.info(`Using the existing D1 database "${dbName}".`);
			} else {
				if (databases.length >= FREE_D1_LIMIT) {
					p.log.warn(
						`This account already has ${databases.length} D1 databases; the free plan allows ${FREE_D1_LIMIT}. ` +
							"Use another (free) Cloudflare account, remove unused databases, or upgrade to Workers Paid.",
					);
				}
				await task(`Creating D1 database "${dbName}"...`, async () => {
					await runWrangler(root, ["d1", "create", dbName, "--update-config=false"]);
					database = (await listDatabases()).find((db) => db.name === dbName);
					if (!database) throw new Error(`D1 database "${dbName}" was not created.`);
					return `D1 database "${dbName}" created`;
				});
			}
			if (dbName !== config.d1.database_name) {
				await replaceWranglerValue(root, "database_name", config.d1.database_name, dbName);
			}
			await replaceWranglerValue(root, "database_id", PLACEHOLDER_D1_ID, database.uuid);
		}

		if (needKv) {
			/** @returns {Promise<any[]>} */
			const listNamespaces = async () => parseJsonOutput(await runWrangler(root, ["kv", "namespace", "list"], { json: true }));
			let namespace = (await listNamespaces()).find((ns) => ns.title === kvName);
			if (namespace) {
				p.log.info(`Using the existing KV namespace "${kvName}".`);
			} else {
				await task(`Creating KV namespace "${kvName}"...`, async () => {
					await runWrangler(root, ["kv", "namespace", "create", kvName, "--update-config=false"]);
					namespace = (await listNamespaces()).find((ns) => ns.title === kvName);
					if (!namespace) throw new Error(`KV namespace "${kvName}" was not created.`);
					return `KV namespace "${kvName}" created`;
				});
			}
			await replaceWranglerValue(root, "id", PLACEHOLDER_KV_ID, namespace.id);
		}
	}

	await task("Applying database migrations...", async () => {
		const output = await runWrangler(root, ["d1", "migrations", "apply", "DB", "--remote", ...CONFIG_ARGS]);
		const applied = (output.match(/✅/g) ?? []).length;
		return applied > 0 ? `Database migrations applied (${applied})` : "Database schema up to date";
	});
}

/** @param {string} dir */
async function countHtmlPages(dir) {
	let count = 0;
	for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
		if (entry.isFile() && entry.name.endsWith(".html")) count++;
	}
	return count;
}

/**
 * @param {string} root
 * @param {boolean} skipBuild
 */
export async function buildAndDeploy(root, skipBuild) {
	if (!skipBuild) {
		/** @type {string[]} */
		const notices = [];
		await task("Pulling published content...", () => pullContent(root, { onNotice: (message) => notices.push(message) }));
		for (const notice of notices) p.log.info(notice);

		await task("Building the site...", async () => {
			await execNodeBin(root, "astro", "astro", ["build"]);
			return `Site built (${await countHtmlPages(path.join(root, "dist", "client"))} pages)`;
		});
	}

	let siteUrl = (await readProjectState(root)).siteUrl;
	await task("Deploying to Cloudflare...", async () => {
		// Uses the config the Cloudflare adapter generated in dist/ (via .wrangler/deploy).
		const output = await runWrangler(root, ["deploy"]);
		const deployedUrl = output.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0];
		if (deployedUrl) {
			siteUrl = deployedUrl;
			await updateProjectState(root, { siteUrl });
		}
		return siteUrl ? `Deployed to ${siteUrl}` : "Deployed";
	});
	return siteUrl;
}

/**
 * @param {string} root
 * @param {boolean} yes
 */
async function ensureFirstEditor(root, yes) {
	const db = await openDatabase(root, { remote: true });
	try {
		const [{ count }] = await db.all("SELECT COUNT(*) AS count FROM users");
		if (Number(count) > 0) return;
		if (yes) {
			p.log.warn("No CMS users yet. Add one with `capsulo users add <email-or-username>`.");
			return;
		}

		p.log.step("Create the first editor (your client). You can add more with `capsulo users add`.");
		const login = answer(
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
		);
		const name = answer(await p.text({ message: "Their name (optional)" }));
		const password = generatePassword();
		await insertUser(db, { login, name: name || null, password });
		printCredentials(login.trim(), password);
	} finally {
		await db.close();
	}
}

/**
 * @param {string} root
 * @param {boolean} yes
 */
async function ensureGitRemote(root, yes) {
	const remote = await git(root, ["remote", "get-url", "origin"]).catch(() => "");
	if (remote) return;

	const hasGh = await exec("gh", ["--version"], { cwd: root, mode: "json" }).then(
		() => true,
		() => false,
	);
	if (!hasGh) {
		p.log.warn(
			"No git remote yet. Create a private GitHub repo and push this project (GitHub CLI: `gh repo create --private --source . --push`).",
		);
		return;
	}

	const create =
		yes || answer(await p.confirm({ message: "Create a private GitHub repository for this project and push it?" }));
	if (!create) return;
	const { name } = await readProjectConfig(root);
	await task("Creating the GitHub repository...", async () => {
		await exec("gh", ["repo", "create", name, "--private", "--source", ".", "--push"], { cwd: root });
		return `GitHub repository created: ${await git(root, ["remote", "get-url", "origin"])}`;
	});
}

/**
 * The deploy wrote resource ids (wrangler.jsonc) and the site URL (.capsulo/project.json);
 * CI builds need both, so offer to commit them. Failing here must not stop the deploy.
 * @param {string} root
 * @param {boolean} yes
 */
export async function commitDeployState(root, yes) {
	const status = await git(root, ["status", "--porcelain", "--", ...DEPLOY_STATE_FILES]).catch(() => "");
	if (!status) return;

	const commit =
		yes || answer(await p.confirm({ message: `Commit the deploy settings (${DEPLOY_STATE_FILES.join(", ")})?` }));
	if (!commit) {
		p.log.warn(`Commit ${DEPLOY_STATE_FILES.join(" and ")} before connecting Workers Builds.`);
		return;
	}

	try {
		await git(root, ["add", "--", ...DEPLOY_STATE_FILES]);
		await git(root, ["commit", "-m", "chore: capsulo deploy settings", "--", ...DEPLOY_STATE_FILES]);
	} catch (error) {
		p.log.warn(
			`Could not commit the deploy settings (${error instanceof Error ? error.message : String(error)}). ` +
				`Commit ${DEPLOY_STATE_FILES.join(" and ")} yourself.`,
		);
		return;
	}

	const remote = await git(root, ["remote", "get-url", "origin"]).catch(() => "");
	if (!remote) {
		p.log.success("Deploy settings committed.");
		return;
	}
	try {
		await git(root, ["push"]);
		p.log.success("Deploy settings committed and pushed.");
	} catch {
		p.log.warn("Deploy settings committed, but the push failed. Push manually.");
	}
}

/**
 * Workers Builds' repo connection and Deploy Hooks can only be created in the dashboard
 * for now (cloudflare/workers-sdk#12058), so this step is guided.
 * @param {string} root
 * @param {string} accountId
 * @param {boolean} yes
 */
async function ensureAutoPublish(root, accountId, yes) {
	const secrets = parseJsonOutput(
		await runWrangler(root, ["secret", "list", ...CONFIG_ARGS, "--format", "json"], { json: true }).catch(() => "[]"),
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
	if (yes) {
		p.log.warn("Skipped (--yes). Re-run `capsulo deploy` to paste the Deploy Hook URL.");
		return;
	}
	const hookUrl = answer(
		await p.text({
			message: "Paste the Deploy Hook URL (leave empty to do this later)",
			validate: (value) =>
				!value || value.startsWith("https://api.cloudflare.com/") ? undefined : "That is not a Deploy Hook URL.",
		}),
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
		options: {
			"db-name": { type: "string" },
			"kv-name": { type: "string" },
			yes: { type: "boolean", short: "y" },
			"skip-build": { type: "boolean" },
			verbose: { type: "boolean" },
			help: { type: "boolean", short: "h" },
		},
	});
	if (values.help) {
		console.log(DEPLOY_HELP);
		return;
	}
	setVerbose(values.verbose ?? false);
	const yes = values.yes ?? false;

	const root = findProjectRoot();
	p.intro("capsulo deploy");
	const accountId = await ensureLogin(root);
	await ensureResources(root, { dbName: values["db-name"], kvName: values["kv-name"], yes });
	const siteUrl = await buildAndDeploy(root, values["skip-build"] ?? false);
	await ensureFirstEditor(root, yes);
	await ensureGitRemote(root, yes);
	await commitDeployState(root, yes);
	await ensureAutoPublish(root, accountId, yes);
	p.outro(siteUrl ? `Live at ${siteUrl}  (CMS: ${siteUrl}/admin)` : "Deployed.");
}
