import { writable } from "svelte/store";
import { capsuloFetch, jsonBody } from "$lib/api/capsulo-client";

/** The signed-in editor, as returned by `/api/capsulo/auth/me`. */
export type SessionUser = {
	id: string;
	login: string;
	email: string | null;
	name: string | null;
	avatarUrl: string | null;
};

export type Session = { user: SessionUser };

export const session = writable<Session | null>(null);

export function sessionDisplayName(user: SessionUser | null | undefined): string {
	return user?.name?.trim() || user?.login || "";
}

export async function syncSession(): Promise<void> {
	const { data } = await capsuloFetch<{ user: SessionUser | null }>("/auth/me");
	session.set(data?.user ? { user: data.user } : null);
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

	const { stretchPassword } = await import("capsulo/password");
	const key = await stretchPassword(password, challenge.data.salt, challenge.data.iterations);
	const result = await capsuloFetch<{ user: SessionUser }>("/auth/login", {
		method: "POST",
		body: jsonBody({ login, key })
	});
	if (result.error !== null) return { user: null, error: result.error };

	session.set({ user: result.data.user });
	return { user: result.data.user, error: null };
}

export async function signOut(): Promise<void> {
	await capsuloFetch("/auth/logout", { method: "POST" });
	session.set(null);
}
