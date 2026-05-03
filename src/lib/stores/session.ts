import type { Session } from "@supabase/supabase-js";
import { writable } from "svelte/store";
import { supabase } from "$/db/supabase";

export type UserProfile = {
	id: string;
	name: string | null;
	avatar_url: string | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
};

export const session = writable<Session | null>(null);
export const userProfile = writable<UserProfile | null>(null);

export function sessionDisplayName(profile: UserProfile | null | undefined): string {
	const n = profile?.name;
	return typeof n === "string" ? n.trim() : "";
}

async function refreshUserProfile(next: Session | null): Promise<void> {
	if (!next?.user?.id) {
		userProfile.set(null);
		return;
	}
	const { data, error } = await supabase
		.from("user_profiles")
		.select("*")
		.eq("id", next.user.id)
		.maybeSingle();
	if (error) {
		console.warn("[session] user_profiles:", error.message);
		userProfile.set(null);
		return;
	}
	userProfile.set(data as UserProfile | null);
}

let listenersAttached = false;

function attachAuthListeners() {
	if (typeof window === "undefined" || listenersAttached) return;
	listenersAttached = true;
	supabase.auth.onAuthStateChange((_event, next) => {
		session.set(next);
		void refreshUserProfile(next);
	});
}

export async function syncSession(): Promise<void> {
	attachAuthListeners();
	const { data } = await supabase.auth.getSession();
	session.set(data.session);
	await refreshUserProfile(data.session);
}
