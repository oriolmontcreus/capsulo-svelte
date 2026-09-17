import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { loadEnv, type Plugin } from "vite";

/**
 * DEV ONLY (`configureServer` never runs in builds). Signs a development account in so
 * humans and AI agents can use `/admin/*` without going through the magic link flow.
 *
 * Runs as a Vite dev-server middleware because Astro strips request headers (and so
 * cookies) from prerendered routes. Credentials come from the non-public
 * `DEV_AUTH_EMAIL` / `DEV_AUTH_PASSWORD` env vars and never reach the client bundle.
 * The resulting cookies are the same ones `createBrowserClient` reads, so RLS works as usual.
 *
 * Set `DEV_AUTO_LOGIN=false` to disable it and test the real login flow.
 */

const ADMIN_LOGIN_PATH = "/admin/login";

function isAdminPathname(pathname: string): boolean {
	return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Mirrors supabase-js' default storage key; the cookie may be chunked as `<key>.0`, `<key>.1`... */
function authCookieKey(supabaseUrl: string): string {
	return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

export function devAutoLoginPlugin(): Plugin {
	return {
		name: "capsulo-dev-auto-login",
		apply: "serve",
		configureServer(server) {
			const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), "");
			if (env.DEV_AUTO_LOGIN === "false") return;

			const { DEV_AUTH_EMAIL: email, DEV_AUTH_PASSWORD: password } = env;
			const { PUBLIC_SUPABASE_URL: supabaseUrl, PUBLIC_SUPABASE_KEY: supabaseKey } = env;
			if (!email || !password || !supabaseUrl || !supabaseKey) {
				server.config.logger.warn(
					"[dev-auto-login] DEV_AUTH_EMAIL / DEV_AUTH_PASSWORD not set; automatic dev login disabled.",
				);
				return;
			}
			const cookieKey = authCookieKey(supabaseUrl);

			server.middlewares.use(async (req, res, next) => {
				const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
				if (req.method !== "GET" || !isAdminPathname(pathname)) return next();

				// A session cookie already exists: the browser client owns it (and its refreshes).
				const jar = parse(req.headers.cookie ?? "");
				if (Object.keys(jar).some((n) => n === cookieKey || n.startsWith(`${cookieKey}.`))) {
					return next();
				}

				try {
					const cookiesToWrite: string[] = [];
					const supabase = createServerClient(supabaseUrl, supabaseKey, {
						cookies: {
							getAll: () => [],
							setAll(cookiesToSet) {
								for (const { name, value, options } of cookiesToSet) {
									cookiesToWrite.push(serialize(name, value, options));
								}
							},
						},
					});

					const { error } = await supabase.auth.signInWithPassword({ email, password });
					if (error) throw error;
					server.config.logger.info(`[dev-auto-login] Signed in as ${email}.`, { timestamp: true });

					// Send the browser the new cookies and reload the same URL with them, so the page
					// (and the Pages auth middleware, when proxied) sees the session on first render.
					// From the login page, go straight into the admin.
					res.statusCode = 302;
					res.setHeader("Set-Cookie", cookiesToWrite);
					res.setHeader("Cache-Control", "no-store");
					res.setHeader("Location", pathname === ADMIN_LOGIN_PATH ? "/admin" : req.url ?? "/admin");
					res.end();
				} catch (error) {
					server.config.logger.error(
						`[dev-auto-login] Sign-in as ${email} failed: ${error instanceof Error ? error.message : String(error)}`,
					);
					next();
				}
			});
		},
	};
}
