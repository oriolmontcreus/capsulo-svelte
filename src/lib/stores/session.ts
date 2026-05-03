import type { Session } from "@supabase/supabase-js";
import { writable } from "svelte/store";
import { supabase } from "$/db/supabase";

export const session = writable<Session | null>(null);

let listenersAttached = false;

function attachAuthListeners() {
	if (typeof window === "undefined" || listenersAttached) return;
	listenersAttached = true;
	supabase.auth.onAuthStateChange((_event, next) => {
		session.set(next);
	});
}

export async function syncSession(): Promise<void> {
	attachAuthListeners();
	const { data } = await supabase.auth.getSession();
	session.set(data.session);
}
