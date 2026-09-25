// Bindings from wrangler.jsonc. Declared here instead of `wrangler types` output because
// the runtime globals it generates clash with the DOM types used by the admin.
declare module "cloudflare:workers" {
	import type { D1Database, KVNamespace } from "@cloudflare/workers-types/index.ts";

	export const env: {
		DB: D1Database;
		UPLOADS: KVNamespace;
		/** Workers Builds Deploy Hook URL, set with `wrangler secret put DEPLOY_HOOK_URL`. */
		DEPLOY_HOOK_URL?: string;
		/** Set to "false" in `.dev.vars` to test the real login flow in `astro dev`. */
		DEV_AUTO_LOGIN?: string;
	};

	export function waitUntil(promise: Promise<unknown>): void;
}
