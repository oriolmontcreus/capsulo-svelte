/// <reference types="@cloudflare/workers-types" />

import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

interface Env {
	/** Preferidas en Pages → Settings → Variables (evitan confundir con el build de Astro). */
	SUPABASE_URL?: string;
	SUPABASE_ANON_KEY?: string;
	/** Fallback: mismas claves que usa el cliente en `.env` local / algunos despliegues. */
	PUBLIC_SUPABASE_URL?: string;
	PUBLIC_SUPABASE_KEY?: string;
}

function getSupabaseBindings(env: Env): { url: string; anonKey: string } | null {
	const url = env.SUPABASE_URL ?? env.PUBLIC_SUPABASE_URL;
	const anonKey = env.SUPABASE_ANON_KEY ?? env.PUBLIC_SUPABASE_KEY;
	if (!url || !anonKey) return null;
	return { url, anonKey };
}

function isAdminRoute(pathname: string): boolean {
	return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function onRequest(
	context: EventContext<Env, string, unknown>,
): Promise<Response> {
	const url = new URL(context.request.url);

	if (!isAdminRoute(url.pathname)) {
		return context.next();
	}

	const bindings = getSupabaseBindings(context.env);
	if (!bindings) {
		return new Response(
			"Missing Supabase bindings: set SUPABASE_URL + SUPABASE_ANON_KEY (or PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_KEY) for Pages Functions.",
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
		return Response.redirect(new URL("/login", url.origin).href, 302);
	}

	response.headers.set("Cache-Control", "private, no-store, max-age=0");
	return response;
}
