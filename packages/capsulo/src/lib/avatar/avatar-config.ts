/**
 * Editors' generated avatars (DiceBear "Notionists Neutral", CC0). Only the seed and the
 * background are stored, as JSON in `users.avatar`; the SVG is drawn in the browser by
 * `avatar-render.ts`. This module has no DiceBear import so the server can validate with it.
 */
export type AvatarConfig = { seed: string; background: string };

/** Soft pastels that read on both the light and dark admin themes. Hex without `#`. */
export const AVATAR_BACKGROUNDS = [
	"ffd5dc",
	"ffdfbf",
	"fdf1b8",
	"d1f4d9",
	"c1ece9",
	"b6e3f4",
	"d1d4f9",
	"e4d1f9"
] as const;

const SEED_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isAvatarConfig(value: unknown): value is AvatarConfig {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { seed, background } = value as Record<string, unknown>;
	return (
		typeof seed === "string" &&
		SEED_PATTERN.test(seed) &&
		typeof background === "string" &&
		(AVATAR_BACKGROUNDS as readonly string[]).includes(background)
	);
}

/** The `users.avatar` column; anything malformed falls back to the default avatar. */
export function parseAvatarConfig(text: string | null | undefined): AvatarConfig | null {
	if (!text) return null;
	try {
		const value: unknown = JSON.parse(text);
		return isAvatarConfig(value) ? { seed: value.seed, background: value.background } : null;
	} catch {
		return null;
	}
}

const SEED_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomAvatarSeed(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(10)), (byte) => SEED_ALPHABET[byte % SEED_ALPHABET.length]).join("");
}
