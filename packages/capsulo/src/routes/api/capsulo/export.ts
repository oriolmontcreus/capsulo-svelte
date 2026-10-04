import { exportPublishedContent } from "$lib/server/content";
import { handle } from "$lib/server/http";

export const prerender = false;

/**
 * Public: the published content the static build renders (read by `capsulo pull`).
 * It only contains what the live site already shows; drafts never leave the browser.
 */
export const GET = handle(async () => {
	return new Response(await exportPublishedContent(), {
		headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
	});
});
