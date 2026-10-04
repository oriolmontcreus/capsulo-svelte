import { fileURLToPath } from "node:url";
import path from "node:path";
import cloudflare from "@astrojs/cloudflare";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
import { sessionDrivers } from "astro/config";

import type { CapsuloConfig } from "../lib/config/define-config";
import { getI18nConfig } from "../lib/config/i18n-resolve";
import { resolveAiConfig } from "../lib/ai/config-resolve";
import { PAGES_DIR, SRC_DIR } from "./paths";
import { buildUnprefixedLocaleRedirects, listLocalizedPageRoutes, writeStaticRedirectsFile } from "./plugins/i18n-routes";
import { astroClientDepsFixPlugin } from "./plugins/vite-plugin-astro-client-deps-fix";
import { capsuleManifestPlugin } from "./plugins/vite-plugin-capsule-manifest";
import { capsuloAiDevPlugin } from "./plugins/vite-plugin-capsulo-ai-dev";
import { capsuloPublishedPlugin } from "./plugins/vite-plugin-capsulo-published";
import { capsuloVirtualModulesPlugin } from "./plugins/vite-plugin-capsulo-virtual";
import { packageSourcePlugin } from "./plugins/vite-plugin-package-source";
import { schemaTypesPlugin } from "./plugins/vite-plugin-schema-types";

/** Admin pages and the CMS API, served from Capsulo's own files. */
const ROUTES: [pattern: string, file: string][] = [
	["/admin", "routes/admin.astro"],
	["/admin/login", "routes/admin/login.astro"],
	["/admin/page-editor", "routes/admin/page-editor/index.astro"],
	["/admin/page-editor/[...slug]", "routes/admin/page-editor/[...slug].astro"],
	["/admin/globals", "routes/admin/globals.astro"],
	["/admin/changes", "routes/admin/changes.astro"],
	["/admin/history", "routes/admin/history.astro"],
	["/admin/schema-prototype", "routes/admin/schema-prototype.astro"],
	["/admin-capsules-prototype", "routes/admin-capsules-prototype.astro"],
	["/api/capsulo/ai", "routes/api/capsulo/ai.ts"],
	["/api/capsulo/ai/commit-message", "routes/api/capsulo/ai/commit-message.ts"],
	["/api/capsulo/auth/challenge", "routes/api/capsulo/auth/challenge.ts"],
	["/api/capsulo/auth/login", "routes/api/capsulo/auth/login.ts"],
	["/api/capsulo/auth/logout", "routes/api/capsulo/auth/logout.ts"],
	["/api/capsulo/auth/me", "routes/api/capsulo/auth/me.ts"],
	["/api/capsulo/commits", "routes/api/capsulo/commits.ts"],
	["/api/capsulo/export", "routes/api/capsulo/export.ts"],
	["/api/capsulo/globals", "routes/api/capsulo/globals.ts"],
	["/api/capsulo/media/[...key]", "routes/api/capsulo/media/[...key].ts"],
	["/api/capsulo/pages/[...pageId]", "routes/api/capsulo/pages/[...pageId].ts"],
	["/api/capsulo/revisions", "routes/api/capsulo/revisions.ts"],
	["/api/capsulo/uploads", "routes/api/capsulo/uploads.ts"]
];

/**
 * The Cloudflare adapter with the options Capsulo needs. Astro only accepts an adapter from
 * astro.config itself, so sites set `adapter: capsuloAdapter()` next to `capsulo()`.
 */
export function capsuloAdapter(): AstroIntegration {
	const adapter = cloudflare({
		// Pages stay prerendered (static, free to serve). Only `/api/capsulo/*` runs on the Worker.
		prerenderEnvironment: "node",
		// Workers AI (the admin's AI agent) has no local simulator. With remote bindings on,
		// `astro dev` would not start without a Cloudflare login; the AI dev proxy calls
		// Workers AI only when the sidebar is used. D1 and KV are local either way.
		remoteBindings: false,
		imageService: { build: "compile", runtime: "passthrough" }
	});

	// The CMS keeps its own sessions in D1. The adapter's setup runs before any integration's
	// and provisions a KV namespace for Astro sessions unless a driver is set, so set it first.
	const setup = adapter.hooks["astro:config:setup"];
	adapter.hooks["astro:config:setup"] = (params) => {
		const { session } = params.config;
		const config =
			session === false || session?.driver
				? params.config
				: params.updateConfig({ session: { driver: sessionDrivers.lruCache() } });
		return setup?.({ ...params, config });
	};
	return adapter;
}

/** Capsulo's admin, API and build plumbing. Pass the default export of capsulo.config.ts. */
export default function capsulo(config: CapsuloConfig): AstroIntegration {
	const i18n = getI18nConfig(config);
	const srcDir = fileURLToPath(SRC_DIR);
	let pagesDir = "";

	return {
		name: "capsulo",
		hooks: {
			"astro:config:setup": ({ config: astroConfig, updateConfig, injectRoute, addMiddleware, logger }) => {
				pagesDir = path.join(fileURLToPath(astroConfig.root), PAGES_DIR);

				if (astroConfig.adapter?.name !== "@astrojs/cloudflare") {
					logger.warn("Capsulo runs on Cloudflare: add `adapter: capsuloAdapter()` (from \"capsulo/astro\") to astro.config.");
				}

				const loginRedirects = Object.fromEntries(i18n.locales.map((locale) => [`/${locale}/login`, "/admin/login"]));

				updateConfig({
					integrations: astroConfig.integrations.some((integration) => integration.name === "@astrojs/svelte") ? [] : [svelte()],
					// No Astro `i18n` block: Capsulo routes locales itself. Public pages are injected at
					// /{locale}/* (below) and its middleware redirects `/`; the admin stays at /admin/*.
					redirects: {
						...(i18n.prefixDefaultLocale ? buildUnprefixedLocaleRedirects(i18n.defaultLocale, pagesDir) : {}),
						"/login": "/admin/login",
						...loginRedirects
					},
					vite: {
						plugins: [
							capsuloVirtualModulesPlugin(config, fileURLToPath(new URL("lib/globals/empty-globals.schema.ts", SRC_DIR))),
							astroClientDepsFixPlugin(srcDir),
							packageSourcePlugin(srcDir),
							capsuleManifestPlugin(),
							capsuloPublishedPlugin(),
							capsuloAiDevPlugin(resolveAiConfig(config)),
							schemaTypesPlugin(),
							tailwindcss()
						],
						resolve: { dedupe: ["astro", "svelte"] },
						server: {
							// Dev only. Vite serves pre-bundled deps (`/node_modules/.vite/deps/*?v=…`) as `immutable`,
							// but an entry like `svelte.js?v=…` keeps its URL while the shared chunks it imports get a
							// new `?v=` whenever deps are re-optimized (e.g. after switching branches). The browser then
							// mixes cached and fresh files, loads two Svelte runtimes and hydration crashes
							// (`node.remove is not a function`). `no-cache` makes it revalidate by ETag (cheap 304s).
							headers: { "Cache-Control": "no-cache" }
						}
					}
				});

				for (const [pattern, file] of ROUTES) {
					injectRoute({ pattern, entrypoint: new URL(file, SRC_DIR) });
				}
				for (const route of listLocalizedPageRoutes(i18n, pagesDir)) {
					injectRoute(route);
				}

				addMiddleware({ entrypoint: new URL("middleware.ts", SRC_DIR), order: "pre" });
			},

			"astro:config:done": ({ injectTypes }) => {
				injectTypes({
					filename: "types.d.ts",
					content: `/// <reference path=${JSON.stringify(path.join(srcDir, "types", "client.d.ts").replaceAll("\\", "/"))} />\n`
				});
			},

			"astro:build:done": ({ dir }) => {
				if (!i18n.prefixDefaultLocale) return;
				writeStaticRedirectsFile(fileURLToPath(dir), i18n.defaultLocale, pagesDir);
			}
		}
	};
}
