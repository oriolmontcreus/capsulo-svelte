import { endSession } from "$lib/server/auth";
import { assertSameOrigin, handle, json } from "$lib/server/http";

export const prerender = false;

export const POST = handle(async (context) => {
	assertSameOrigin(context.request);
	await endSession(context);
	return json({ ok: true });
});
