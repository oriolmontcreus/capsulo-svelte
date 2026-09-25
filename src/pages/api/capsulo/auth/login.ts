import { startSession, verifyLogin } from "$lib/server/auth";
import { HttpError, assertSameOrigin, handle, isRecord, json, readJson, requireString } from "$lib/server/http";

export const prerender = false;

export const POST = handle(async (context) => {
	assertSameOrigin(context.request);
	const body = await readJson<unknown>(context.request);
	if (!isRecord(body)) throw new HttpError(400, "Expected a JSON object.");

	const user = await verifyLogin(requireString(body.login, "login", 320), requireString(body.key, "key", 100));
	await startSession(context, user.id);
	return json({ user });
});
