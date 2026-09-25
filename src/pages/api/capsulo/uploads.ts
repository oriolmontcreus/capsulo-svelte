import { requireUser } from "$lib/server/auth";
import { HttpError, handle, isRecord, json, readJson } from "$lib/server/http";
import { deleteUploads, storeUpload } from "$lib/server/uploads";

export const prerender = false;

/** Raw file bytes as the body; `Content-Type` and a URI-encoded `X-File-Name` header describe it. */
export const POST = handle(async (context) => {
	const user = await requireUser(context);
	return json({ key: await storeUpload(context.request, user.id) });
});

/** Body: `{ keys: string[] }`. Unknown keys are ignored. */
export const DELETE = handle(async (context) => {
	await requireUser(context);
	const body = await readJson<unknown>(context.request);
	if (!isRecord(body) || !Array.isArray(body.keys)) throw new HttpError(400, '"keys" must be an array.');
	await deleteUploads(body.keys.filter((key): key is string => typeof key === "string"));
	return json({ ok: true });
});
