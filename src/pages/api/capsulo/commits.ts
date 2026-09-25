import { requireUser } from "$lib/server/auth";
import { commitPages, listCommits } from "$lib/server/content";
import { HttpError, handle, isRecord, json, readJson } from "$lib/server/http";
import { requestRebuild } from "$lib/server/publish";
import { scheduleUnusedUploadCleanup } from "$lib/server/uploads";

export const prerender = false;

export const GET = handle(async (context) => {
	await requireUser(context);
	const cursor = context.url.searchParams.get("cursor");
	const limit = Math.min(Math.max(Number(context.url.searchParams.get("limit")) || 25, 1), 100);
	return json(await listCommits(cursor, limit));
});

/** Body: `{ message, pages: [{ pageId, content }] }`. All pages are written atomically. */
export const POST = handle(async (context) => {
	const user = await requireUser(context);
	const body = await readJson<unknown>(context.request);
	if (!isRecord(body)) throw new HttpError(400, "Expected a JSON object.");

	const result = await commitPages(user.id, body.message, body.pages);
	scheduleUnusedUploadCleanup();
	return json({ ...result, rebuildRequested: requestRebuild() });
});
