import { requireUser } from "$lib/server/auth";
import { getPage } from "$lib/server/content";
import { HttpError, handle, json } from "$lib/server/http";

export const prerender = false;

/** Current committed document for a page. `?meta=1` skips the content. */
export const GET = handle(async (context) => {
	await requireUser(context);
	const pageId = context.params.pageId;
	if (!pageId) throw new HttpError(400, "Missing page id.");

	const page = await getPage(pageId);
	if (!page) return json({ page: null });
	const metaOnly = context.url.searchParams.get("meta") === "1";
	return json({ page: metaOnly ? { updatedAt: page.updatedAt } : page });
});
