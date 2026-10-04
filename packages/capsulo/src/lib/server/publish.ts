import { env, waitUntil } from "cloudflare:workers";

/**
 * Asks Workers Builds to rebuild the static site after a commit. Cloudflare dedupes
 * hooks fired before a build starts, so a burst of commits costs one build.
 * Returns false when no Deploy Hook is configured (the site then needs `capsulo deploy`).
 */
export function requestRebuild(): boolean {
	const hookUrl = env.DEPLOY_HOOK_URL;
	if (!hookUrl) return false;
	waitUntil(
		fetch(hookUrl, { method: "POST" })
			.then((response) => {
				if (!response.ok) console.error(`[capsulo] Deploy hook responded ${response.status}.`);
			})
			.catch((error) => console.error("[capsulo] Deploy hook failed:", error))
	);
	return true;
}
