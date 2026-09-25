import { requireUser } from "$lib/server/auth";
import { getGlobals, saveGlobals } from "$lib/server/content";
import { HttpError, handle, isRecord, json, readJson } from "$lib/server/http";
import { requestRebuild } from "$lib/server/publish";
import { scheduleUnusedUploadCleanup } from "$lib/server/uploads";

export const prerender = false;

export const GET = handle(async (context) => {
	await requireUser(context);
	return json({ globals: await getGlobals() });
});

export const PUT = handle(async (context) => {
	const user = await requireUser(context);
	const body = await readJson<unknown>(context.request);
	if (!isRecord(body)) throw new HttpError(400, "Expected a JSON object.");

	const result = await saveGlobals(user.id, body.content);
	scheduleUnusedUploadCleanup();
	return json({ ...result, rebuildRequested: requestRebuild() });
});
