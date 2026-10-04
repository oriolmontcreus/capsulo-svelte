import { requireUser } from "$lib/server/auth";
import { handle, json } from "$lib/server/http";
import { storeUpload } from "$lib/server/uploads";

export const prerender = false;

/** Raw file bytes as the body; `Content-Type` and a URI-encoded `X-File-Name` header describe it. */
export const POST = handle(async (context) => {
	const user = await requireUser(context);
	return json({ key: await storeUpload(context.request, user.id) });
});
