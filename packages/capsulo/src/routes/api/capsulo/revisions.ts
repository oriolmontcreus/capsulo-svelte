import { requireUser } from "$lib/server/auth";
import { getRevisionWithParent } from "$lib/server/content";
import { HttpError, handle, json } from "$lib/server/http";

export const prerender = false;

/** `?pageId=...&revisionId=...` returns that revision and the one before it. */
export const GET = handle(async (context) => {
	await requireUser(context);
	const pageId = context.url.searchParams.get("pageId");
	const revisionId = Number(context.url.searchParams.get("revisionId"));
	if (!pageId || !Number.isInteger(revisionId)) throw new HttpError(400, "pageId and revisionId are required.");
	return json({ revisions: await getRevisionWithParent(pageId, revisionId) });
});
