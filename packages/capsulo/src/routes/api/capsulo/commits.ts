import { requireUser } from "../../../lib/server/auth";
import { commitContent, listCommits } from "../../../lib/server/content";
import { HttpError, handle, isRecord, json, readJson, requestUiLocale } from "../../../lib/server/http";
import { requestRebuild } from "../../../lib/server/publish";
import { scheduleUnusedUploadCleanup } from "../../../lib/server/uploads";

export const prerender = false;

export const GET = handle(async (context) => {
	const user = await requireUser(context);
	const cursor = context.url.searchParams.get("cursor");
	const limit = Math.min(Math.max(Number(context.url.searchParams.get("limit")) || 25, 1), 100);
	// `?author=me`: only the signed-in user's commits (the AI commit message imitates them).
	const createdBy = context.url.searchParams.get("author") === "me" ? user.id : null;
	return json(await listCommits(cursor, limit, createdBy));
});

/**
 * Body: `{ message, pages?: [{ pageId, content }], globals?: content }`. Everything is
 * written atomically.
 */
export const POST = handle(async (context) => {
	const user = await requireUser(context);
	const body = await readJson<unknown>(context.request);
	if (!isRecord(body)) throw new HttpError(400, "Expected a JSON object.");

	const result = await commitContent(user.id, body.message, body.pages, body.globals, requestUiLocale(context));
	scheduleUnusedUploadCleanup();
	return json({ ...result, rebuildRequested: requestRebuild() });
});
