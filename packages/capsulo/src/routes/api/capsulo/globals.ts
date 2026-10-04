import { requireUser } from "../../../lib/server/auth";
import { getGlobals } from "../../../lib/server/content";
import { handle, json } from "../../../lib/server/http";

export const prerender = false;

/** Current committed global variables. They are written by `POST /commits`, with pages. */
export const GET = handle(async (context) => {
	await requireUser(context);
	return json({ globals: await getGlobals() });
});
