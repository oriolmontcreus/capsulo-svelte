import { getLoginChallenge } from "$lib/server/auth";
import { handle, isRecord, json, readJson, requireString, HttpError } from "$lib/server/http";

export const prerender = false;

export const POST = handle(async ({ request }) => {
	const body = await readJson<unknown>(request);
	if (!isRecord(body)) throw new HttpError(400, "Expected a JSON object.");
	return json(await getLoginChallenge(requireString(body.login, "login", 320)));
});
