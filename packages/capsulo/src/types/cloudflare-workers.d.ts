// Bindings from wrangler.jsonc. Declared here instead of `wrangler types` output because
// the runtime globals it generates clash with the DOM types used by the admin.
declare module "cloudflare:workers" {
	import type { D1Database, KVNamespace, R2Bucket } from "@cloudflare/workers-types/index.ts";

	export const env: {
		DB: D1Database;
		/** Upload storage by default. Kept as a read-only fallback after moving to R2. */
		UPLOADS?: KVNamespace;
		/** Upload storage for projects that use R2 (`capsulo storage r2`). */
		UPLOADS_BUCKET?: R2Bucket;
		/** Workers AI, used by the admin's AI agent. Free plan: 10,000 Neurons a day, no card. */
		AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
		/** Workers Builds Deploy Hook URL, set with `wrangler secret put DEPLOY_HOOK_URL`. */
		DEPLOY_HOOK_URL?: string;
		/** Set to "false" in `.dev.vars` to test the real login flow in `astro dev`. */
		DEV_AUTO_LOGIN?: string;
	};

	export function waitUntil(promise: Promise<unknown>): void;
}
