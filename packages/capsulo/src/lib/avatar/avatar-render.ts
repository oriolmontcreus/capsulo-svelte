import { Avatar, Style } from "@dicebear/core";
import notionistsNeutral from "@dicebear/styles/notionists-neutral.json";
import { AVATAR_BACKGROUNDS } from "./avatar-config";

let style: Style | null = null;
const cache = new Map<string, string>();

function getStyle(): Style {
	style ??= new Style(notionistsNeutral);
	return style;
}

/** The background DiceBear picks for `seed` when none is saved, so the editor can start from it. */
export function defaultAvatarBackground(seed: string): string {
	const { backgroundColor } = new Avatar(getStyle(), { seed, backgroundColor: [...AVATAR_BACKGROUNDS] }).toJSON().options;
	const picked = (Array.isArray(backgroundColor) ? backgroundColor[0] : backgroundColor) as string | undefined;
	return picked?.replace(/^#/, "") ?? AVATAR_BACKGROUNDS[0];
}

/**
 * The avatar for `seed` as a data URI. Without a `background` DiceBear picks one of
 * `AVATAR_BACKGROUNDS` from the seed, so the default avatar is stable too. Memoized:
 * the commit list draws the same few authors over and over.
 */
export function avatarDataUri(seed: string, background?: string | null): string {
	const key = `${seed}:${background ?? ""}`;
	let uri = cache.get(key);
	if (!uri) {
		uri = new Avatar(getStyle(), {
			seed,
			backgroundColor: background ? [background] : [...AVATAR_BACKGROUNDS]
		}).toDataUri();
		cache.set(key, uri);
	}
	return uri;
}
