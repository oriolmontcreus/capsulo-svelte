/// <reference types="@cloudflare/workers-types" />

import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

interface Env {
	PUBLIC_SUPABASE_URL?: string;
	PUBLIC_SUPABASE_KEY?: string;
}

function getSupabaseBindings(env: Env): { url: string; anonKey: string } | null {
	const url = env.PUBLIC_SUPABASE_URL;
	const anonKey = env.PUBLIC_SUPABASE_KEY;
	if (!url || !anonKey) return null;
	return { url, anonKey };
}

const ADMIN_LOGIN_PATH = "/admin/login";

//TODO: We might want to give the user the option to change the protected cms route to a different prefix
function isAdminRoute(pathname: string): boolean {
	return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminLoginRoute(pathname: string): boolean {
	return pathname === ADMIN_LOGIN_PATH;
}

export async function onRequest(
	context: EventContext<Env, string, unknown>,
): Promise<Response> {
	const url = new URL(context.request.url);

	if (!isAdminRoute(url.pathname) || isAdminLoginRoute(url.pathname)) {
		return context.next();
	}

	const bindings = getSupabaseBindings(context.env);
	if (!bindings) {
		return new Response(
			"Missing Supabase bindings: set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_KEY for Pages Functions.",
			{ status: 503 },
		);
	}

	const response = await context.next();

	const supabase = createServerClient(
		bindings.url,
		bindings.anonKey,
		{
			cookies: {
				getAll() {
					const header = context.request.headers.get("Cookie") ?? "";
					const jar = parse(header);
					return Object.entries(jar)
						.filter((e): e is [string, string] => typeof e[1] === "string")
						.map(([name, value]) => ({ name, value }));
				},
				setAll(cookiesToSet, headersToSet) {
					for (const { name, value, options } of cookiesToSet) {
						response.headers.append("Set-Cookie", serialize(name, value, options));
					}
					for (const [key, value] of Object.entries(headersToSet)) {
						response.headers.set(key, value);
					}
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return Response.redirect(new URL(ADMIN_LOGIN_PATH, url.origin).href, 302);
	}

	response.headers.set("Cache-Control", "private, no-store, max-age=0");
	return response;
}
