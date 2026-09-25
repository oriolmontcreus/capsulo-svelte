// @ts-check
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";

import { openDatabase } from "../lib/d1.js";
import { findProjectRoot, isRealD1Id, readProjectConfig } from "../lib/project.js";
import { MIN_PASSWORD_LENGTH, createPasswordRecord, generatePassword } from "../password.js";

export const USERS_HELP = `Manage the people who can sign in to the CMS.

Usage:
  capsulo users list
  capsulo users add <login> [--name "Jane Doe"] [--email jane@acme.com] [--password <pw> | --ask-password]
  capsulo users update <login> [--name ..] [--email ..] [--login <new>] [--reset-password | --password <pw> | --ask-password] [--disable | --enable]
  capsulo users remove <login> [--yes]

<login> is an email or a username. Add --local or --remote to pick the database
(default: remote once the project is deployed, local before that).
Passwords are generated for you unless you pass one; they are shown only once.`;

const OPTIONS = /** @type {const} */ ({
	local: { type: "boolean" },
	remote: { type: "boolean" },
	name: { type: "string" },
	email: { type: "string" },
	login: { type: "string" },
	password: { type: "string" },
	"ask-password": { type: "boolean" },
	"reset-password": { type: "boolean" },
	disable: { type: "boolean" },
	enable: { type: "boolean" },
	yes: { type: "boolean", short: "y" },
	help: { type: "boolean", short: "h" },
});

/**
 * Inserts a user row (shared with `capsulo deploy`, which creates the first editor).
 * @param {import("../lib/d1.js").Database} db
 * @param {{ login: string, name?: string | null, email?: string | null, password: string }} input
 */
export async function insertUser(db, input) {
	const login = validateLogin(input.login);
	const [existing] = await db.all("SELECT id FROM users WHERE login = ?", [login]);
	if (existing) throw new Error(`A user with login "${login}" already exists.`);

	const record = await createPasswordRecord(input.password);
	await db.batch([
		{
			sql: `INSERT INTO users (id, login, email, name, salt, verifier, kdf_iterations)
			      VALUES (?, ?, ?, ?, ?, ?, ?)`,
			params: [
				crypto.randomUUID(),
				login,
				input.email ?? (looksLikeEmail(login) ? login : null),
				input.name ?? null,
				record.salt,
				record.verifier,
				record.kdf_iterations,
			],
		},
	]);
	return login;
}

/** @param {string} value */
function looksLikeEmail(value) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** @param {string} login */
export function validateLogin(login) {
	const trimmed = login.trim();
	if (!trimmed) throw new Error("The login cannot be empty.");
	if (trimmed.length > 320) throw new Error("The login is too long.");
	if (!looksLikeEmail(trimmed) && !/^[a-zA-Z0-9._-]{2,64}$/.test(trimmed)) {
		throw new Error("Use an email, or a username of 2-64 letters, digits, dots, dashes or underscores.");
	}
	return trimmed;
}

/**
 * Explicit --password, an interactive prompt, or a generated one (printed once).
 * @param {{ password?: string, "ask-password"?: boolean }} values
 * @returns {Promise<{ password: string, generated: boolean }>}
 */
async function choosePassword(values) {
	let password = values.password;
	if (values["ask-password"]) {
		const answer = await p.password({
			message: "New password",
			validate: (value) =>
				(value ?? "").length < MIN_PASSWORD_LENGTH ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined,
		});
		if (p.isCancel(answer)) process.exit(1);
		password = answer;
	}
	if (password === undefined) return { password: generatePassword(), generated: true };
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new Error(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`);
	}
	return { password, generated: false };
}

/**
 * @param {string} login
 * @param {string} password
 */
export function printCredentials(login, password) {
	p.note(`Login:    ${login}\nPassword: ${password}`, "Share these with the editor (shown only once)");
}

/**
 * @param {import("../lib/d1.js").Database} db
 * @param {string} login
 */
async function findUser(db, login) {
	const [user] = await db.all("SELECT id, login, email, name, disabled_at FROM users WHERE login = ?", [login]);
	if (!user) throw new Error(`No user with login "${login}".`);
	return user;
}

/** @param {string[]} argv */
export async function usersCommand(argv) {
	const { values, positionals } = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
	const [action, target] = positionals;
	if (values.help || !action) {
		console.log(USERS_HELP);
		return;
	}
	if (values.local && values.remote) throw new Error("Pass either --local or --remote, not both.");

	const root = findProjectRoot();
	const remote = values.remote ?? (values.local ? false : isRealD1Id((await readProjectConfig(root)).d1.database_id));
	const db = await openDatabase(root, { remote });
	p.log.info(`Using the ${db.label}.`);

	try {
		switch (action) {
			case "list": {
				const users = await db.all(
					"SELECT login, email, name, disabled_at, created_at FROM users ORDER BY created_at",
				);
				if (users.length === 0) {
					p.log.warn("No users yet. Add one with `capsulo users add <email-or-username>`.");
					return;
				}
				console.table(
					users.map((user) => ({
						login: user.login,
						name: user.name ?? "",
						email: user.email ?? "",
						status: user.disabled_at ? "disabled" : "active",
						created: user.created_at.slice(0, 10),
					})),
				);
				return;
			}

			case "add": {
				if (!target) throw new Error("Usage: capsulo users add <login>");
				const { password, generated } = await choosePassword(values);
				const login = await insertUser(db, { login: target, name: values.name, email: values.email, password });
				p.log.success(`Added ${login}.`);
				if (generated) printCredentials(login, password);
				return;
			}

			case "update": {
				if (!target) throw new Error("Usage: capsulo users update <login> [...]");
				if (values.disable && values.enable) throw new Error("Pass either --disable or --enable.");
				const user = await findUser(db, target);
				/** @type {import("../lib/d1.js").Statement[]} */
				const statements = [];
				/** @type {string[]} */
				const sets = [];
				/** @type {unknown[]} */
				const params = [];
				let endSessions = false;
				/** @type {{ password: string, generated: boolean } | null} */
				let newPassword = null;

				if (values.login !== undefined) {
					sets.push("login = ?");
					params.push(validateLogin(values.login));
				}
				if (values.name !== undefined) {
					sets.push("name = ?");
					params.push(values.name || null);
				}
				if (values.email !== undefined) {
					sets.push("email = ?");
					params.push(values.email || null);
				}
				if (values["reset-password"] || values.password !== undefined || values["ask-password"]) {
					newPassword = await choosePassword(values);
					const record = await createPasswordRecord(newPassword.password);
					sets.push("salt = ?", "verifier = ?", "kdf_iterations = ?", "failed_attempts = 0", "locked_until = NULL");
					params.push(record.salt, record.verifier, record.kdf_iterations);
					endSessions = true;
				}
				if (values.disable) {
					sets.push("disabled_at = ?");
					params.push(new Date().toISOString());
					endSessions = true;
				}
				if (values.enable) sets.push("disabled_at = NULL", "failed_attempts = 0", "locked_until = NULL");
				if (sets.length === 0) throw new Error("Nothing to update. See `capsulo users --help`.");

				sets.push("updated_at = ?");
				params.push(new Date().toISOString(), user.id);
				statements.push({ sql: `UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params });
				if (endSessions) statements.push({ sql: "DELETE FROM sessions WHERE user_id = ?", params: [user.id] });
				await db.batch(statements);

				p.log.success(`Updated ${user.login}.${endSessions ? " Their sessions were signed out." : ""}`);
				if (newPassword?.generated) printCredentials(values.login ?? user.login, newPassword.password);
				return;
			}

			case "remove": {
				if (!target) throw new Error("Usage: capsulo users remove <login>");
				const user = await findUser(db, target);
				if (!values.yes) {
					const confirmed = await p.confirm({
						message: `Remove ${user.login}? Their past commits stay in the history without an author.`,
					});
					if (p.isCancel(confirmed) || !confirmed) return;
				}
				await db.batch([{ sql: "DELETE FROM users WHERE id = ?", params: [user.id] }]);
				p.log.success(`Removed ${user.login}.`);
				return;
			}

			default:
				throw new Error(`Unknown action "${action}".\n\n${USERS_HELP}`);
		}
	} finally {
		await db.close();
	}
}
