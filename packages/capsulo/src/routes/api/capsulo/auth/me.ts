import { isUiLocale } from "../../../../lib/admin-i18n/core";
import { getCurrentUser, requireUser, setUserUiLocale } from "../../../../lib/server/auth";
import { HttpError, handle, isRecord, json, readJson } from "../../../../lib/server/http";

export const prerender = false;

export const GET = handle(async (context) => json({ user: await getCurrentUser(context) }));

/** Body: `{ uiLocale: "en" | "es" | "fr" | null }`, the signed-in editor's admin language. */
export const PATCH = handle(async (context) => {
	const user = await requireUser(context);
	const body = await readJson<unknown>(context.request);
	if (!isRecord(body)) throw new HttpError(400, "Expected a JSON object.");
	const { uiLocale } = body;
	if (uiLocale !== null && !isUiLocale(uiLocale)) throw new HttpError(400, '"uiLocale" is not a supported language.');

	await setUserUiLocale(context, user.id, uiLocale);
	return json({ user: { ...user, uiLocale } });
});
