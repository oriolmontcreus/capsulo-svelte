import { get, writable } from "svelte/store";
import { capsuloFetch, jsonBody } from "../api/capsulo-client";
import { getUiLocale, isUiLocale, setUiLocale, type UiLocale } from "../admin-i18n/i18n.svelte";
import type { AvatarConfig } from "../avatar/avatar-config";
import { clearAdminCache } from "../admin/admin-cache";

/** The signed-in editor, as returned by `/api/capsulo/auth/me`. */
export type SessionUser = {
	id: string;
	login: string;
	email: string | null;
	name: string | null;
	avatarUrl: string | null;
	/** Generated avatar the editor picked; null is the default one, seeded by `id`. */
	avatar: AvatarConfig | null;
	/** Admin UI language the editor picked; null follows the project default. */
	uiLocale: UiLocale | null;
};

export type Session = { user: SessionUser };

export const session = writable<Session | null>(null);

export function sessionDisplayName(user: SessionUser | null | undefined): string {
	return user?.name?.trim() || user?.login || "";
}

/** The language saved on the account wins over this browser's (it may have been changed elsewhere). */
function applyAccountUiLocale(user: SessionUser): void {
	if (isUiLocale(user.uiLocale) && user.uiLocale !== getUiLocale()) setUiLocale(user.uiLocale);
}

export async function syncSession(): Promise<void> {
	const { data } = await capsuloFetch<{ user: SessionUser | null }>("/auth/me");
	session.set(data?.user ? { user: data.user } : null);
	if (data?.user) applyAccountUiLocale(data.user);
}

let pendingSync: Promise<void> | null = null;

/** Loads the session unless it already is; concurrent callers share one request. */
export function ensureSession(): Promise<void> {
	if (get(session)) return Promise.resolve();
	pendingSync ??= syncSession().finally(() => (pendingSync = null));
	return pendingSync;
}

/** Switches the admin language now and saves it on the signed-in editor's account. */
export async function changeUiLocale(locale: UiLocale): Promise<void> {
	setUiLocale(locale);
	const { data } = await capsuloFetch<{ user: SessionUser }>("/auth/me", {
		method: "PATCH",
		body: jsonBody({ uiLocale: locale })
	});
	if (data?.user) session.set({ user: data.user });
}

/** Saves the signed-in editor's avatar (null: back to the default one). Returns the error, if any. */
export async function changeAvatar(avatar: AvatarConfig | null): Promise<string | null> {
	const result = await capsuloFetch<{ user: SessionUser }>("/auth/me", {
		method: "PATCH",
		body: jsonBody({ avatar })
	});
	if (result.error !== null) return result.error;
	session.set({ user: result.data.user });
	return null;
}

export type SignInResult = { user: SessionUser; error: null } | { user: null; error: string };

/**
 * Password sign-in. The password is stretched here (PBKDF2, the parameters come from
 * the challenge) so the Worker only has to do one cheap hash; see `capsulo/password`.
 */
export async function signIn(login: string, password: string): Promise<SignInResult> {
	const challenge = await capsuloFetch<{ salt: string; iterations: number }>("/auth/challenge", {
		method: "POST",
		body: jsonBody({ login })
	});
	if (challenge.error !== null) return { user: null, error: challenge.error };

	const { stretchPassword } = await import("../../password.js");
	const key = await stretchPassword(password, challenge.data.salt, challenge.data.iterations);
	const result = await capsuloFetch<{ user: SessionUser }>("/auth/login", {
		method: "POST",
		body: jsonBody({ login, key })
	});
	if (result.error !== null) return { user: null, error: result.error };

	clearAdminCache();
	session.set({ user: result.data.user });
	applyAccountUiLocale(result.data.user);
	return { user: result.data.user, error: null };
}

export async function signOut(): Promise<void> {
	await capsuloFetch("/auth/logout", { method: "POST" });
	clearAdminCache();
	session.set(null);
}
