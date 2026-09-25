import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import {
	DEFAULT_KDF_ITERATIONS,
	bytesToBase64Url,
	fakeSaltFor,
	randomHex,
	sha256Hex,
	timingSafeEqualHex,
	verifierForKey
} from "capsulo/password";

import { HttpError, assertSameOrigin, nowIso } from "./http";

const SESSION_COOKIE = "capsulo_session";
/** Readable by the admin shell so it can redirect to login without a round trip. Carries no secret. */
const SIGNED_IN_HINT_COOKIE = "capsulo_signed_in";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_FAILED_ATTEMPTS = 10;
const LOCK_MINUTES = 15;
const DEV_USER_LOGIN = "dev";

export type SessionUser = {
	id: string;
	login: string;
	email: string | null;
	name: string | null;
	avatarUrl: string | null;
};

type UserRow = {
	id: string;
	login: string;
	email: string | null;
	name: string | null;
	avatar_url: string | null;
	salt: string;
	verifier: string;
	kdf_iterations: number;
	failed_attempts: number;
	locked_until: string | null;
	disabled_at: string | null;
};

function toSessionUser(row: Pick<UserRow, "id" | "login" | "email" | "name" | "avatar_url">): SessionUser {
	return { id: row.id, login: row.login, email: row.email, name: row.name, avatarUrl: row.avatar_url };
}

async function findUserByLogin(login: string): Promise<UserRow | null> {
	return env.DB.prepare("SELECT * FROM users WHERE login = ?").bind(login.trim()).first<UserRow>();
}

async function instanceSecret(): Promise<string> {
	const row = await env.DB.prepare("SELECT instance_secret FROM settings WHERE id = 1").first<{
		instance_secret: string;
	}>();
	if (!row) throw new Error("Database is not migrated: run `wrangler d1 migrations apply DB`.");
	return row.instance_secret;
}

/** Salt + iteration count the browser needs to stretch the password. Unknown logins get a stable fake. */
export async function getLoginChallenge(login: string): Promise<{ salt: string; iterations: number }> {
	const user = await findUserByLogin(login);
	if (user && !user.disabled_at) return { salt: user.salt, iterations: user.kdf_iterations };
	return { salt: await fakeSaltFor(await instanceSecret(), login), iterations: DEFAULT_KDF_ITERATIONS };
}

const INVALID_CREDENTIALS = "Invalid login or password.";

export async function verifyLogin(login: string, stretchedKey: string): Promise<SessionUser> {
	const user = await findUserByLogin(login);
	const verifier = await verifierForKey(stretchedKey);
	if (!user || user.disabled_at || !verifier) throw new HttpError(401, INVALID_CREDENTIALS);

	const now = nowIso();
	if (user.locked_until && user.locked_until > now) {
		throw new HttpError(429, "Too many failed attempts. Try again in a few minutes.");
	}

	if (!timingSafeEqualHex(verifier, user.verifier)) {
		const failedAttempts = user.failed_attempts + 1;
		const lockedUntil =
			failedAttempts >= MAX_FAILED_ATTEMPTS
				? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
				: null;
		await env.DB.prepare(
			"UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?"
		)
			.bind(lockedUntil ? 0 : failedAttempts, lockedUntil, user.id)
			.run();
		throw new HttpError(401, INVALID_CREDENTIALS);
	}

	if (user.failed_attempts > 0 || user.locked_until) {
		await env.DB.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?")
			.bind(user.id)
			.run();
	}
	return toSessionUser(user);
}

export async function startSession(context: APIContext, userId: string): Promise<void> {
	const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
	const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
	await env.DB.batch([
		// Opportunistic cleanup keeps the table small without a cron trigger.
		env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < ?").bind(userId, nowIso()),
		env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(
			await sha256Hex(token),
			userId,
			expiresAt
		)
	]);

	const secure = !import.meta.env.DEV;
	context.cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure,
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_TTL_SECONDS
	});
	context.cookies.set(SIGNED_IN_HINT_COOKIE, "1", {
		secure,
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_TTL_SECONDS
	});
}

export async function endSession(context: APIContext): Promise<void> {
	const token = context.cookies.get(SESSION_COOKIE)?.value;
	if (token) {
		await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
	}
	context.cookies.delete(SESSION_COOKIE, { path: "/" });
	context.cookies.delete(SIGNED_IN_HINT_COOKIE, { path: "/" });
}

async function userFromSessionCookie(context: APIContext): Promise<SessionUser | null> {
	const token = context.cookies.get(SESSION_COOKIE)?.value;
	if (!token) return null;
	const row = await env.DB.prepare(
		`SELECT u.id, u.login, u.email, u.name, u.avatar_url
		 FROM sessions s JOIN users u ON u.id = s.user_id
		 WHERE s.token_hash = ? AND s.expires_at > ? AND u.disabled_at IS NULL`
	)
		.bind(await sha256Hex(token), nowIso())
		.first<Pick<UserRow, "id" | "login" | "email" | "name" | "avatar_url">>();
	return row ? toSessionUser(row) : null;
}

/**
 * `astro dev` only: signs the request in as a local "dev" user (created on first use) so
 * humans and AI agents can use /admin without credentials. Never runs in a build.
 */
async function devAutoLogin(context: APIContext): Promise<SessionUser | null> {
	if (!import.meta.env.DEV || env.DEV_AUTO_LOGIN === "false") return null;

	let user = await findUserByLogin(DEV_USER_LOGIN);
	if (!user) {
		// Random verifier: nobody can log in with a password as this user.
		await env.DB.prepare(
			`INSERT OR IGNORE INTO users (id, login, name, salt, verifier, kdf_iterations)
			 VALUES (?, ?, 'Developer', ?, ?, ?)`
		)
			.bind(crypto.randomUUID(), DEV_USER_LOGIN, randomHex(), randomHex(32), DEFAULT_KDF_ITERATIONS)
			.run();
		user = await findUserByLogin(DEV_USER_LOGIN);
	}
	if (!user) return null;

	await startSession(context, user.id);
	return toSessionUser(user);
}

export async function getCurrentUser(context: APIContext): Promise<SessionUser | null> {
	return (await userFromSessionCookie(context)) ?? (await devAutoLogin(context));
}

/** Guard for every non-public endpoint: same-origin writes + a valid session. */
export async function requireUser(context: APIContext): Promise<SessionUser> {
	assertSameOrigin(context.request);
	const user = await getCurrentUser(context);
	if (!user) throw new HttpError(401, "Not signed in.");
	return user;
}
