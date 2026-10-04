import { isUiLocale, type UiLocale } from "../../../../lib/admin-i18n/core";
import { isAvatarConfig, type AvatarConfig } from "../../../../lib/avatar/avatar-config";
import { getCurrentUser, requireUser, setUserAvatar, setUserUiLocale } from "../../../../lib/server/auth";
import { HttpError, handle, isRecord, json, readJson } from "../../../../lib/server/http";

export const prerender = false;

export const GET = handle(async (context) => json({ user: await getCurrentUser(context) }));

/**
 * The signed-in editor's preferences; send only the keys to change.
 * Body: `{ uiLocale?: "en" | "es" | "fr" | null, avatar?: { seed, background } | null }`.
 */
export const PATCH = handle(async (context) => {
	const user = await requireUser(context);
	const body = await readJson<unknown>(context.request);
	if (!isRecord(body)) throw new HttpError(400, "Expected a JSON object.");
	const hasUiLocale = "uiLocale" in body;
	const hasAvatar = "avatar" in body;
	if (!hasUiLocale && !hasAvatar) throw new HttpError(400, 'Expected "uiLocale" or "avatar".');

	const { uiLocale, avatar } = body;
	if (hasUiLocale && uiLocale !== null && !isUiLocale(uiLocale)) {
		throw new HttpError(400, '"uiLocale" is not a supported language.');
	}
	if (hasAvatar && avatar !== null && !isAvatarConfig(avatar)) {
		throw new HttpError(400, '"avatar" must be null or a { seed, background } from the avatar palette.');
	}

	const updated = { ...user };
	if (hasUiLocale) {
		updated.uiLocale = uiLocale as UiLocale | null;
		await setUserUiLocale(context, user.id, updated.uiLocale);
	}
	if (hasAvatar) {
		// Rebuilt so stray keys in the body never reach the column.
		const config = avatar as AvatarConfig | null;
		updated.avatar = config && { seed: config.seed, background: config.background };
		await setUserAvatar(user.id, updated.avatar);
	}
	return json({ user: updated });
});
