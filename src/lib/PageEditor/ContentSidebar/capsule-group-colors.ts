/** Theme ids — colors live in capsule-group-colors.css (edit opacities there). */
export const CAPSULE_GROUP_COLOR_THEME_IDS = [
	"violet",
	"indigo",
	"blue",
	"sky",
	"teal",
	"emerald",
	"lime",
	"amber",
	"orange",
	"rose",
	"fuchsia",
	"pink",
] as const;

export type CapsuleGroupColorThemeId =
	(typeof CAPSULE_GROUP_COLOR_THEME_IDS)[number];

function hashCapsuleKey(key: string): number {
	let hash = 0;
	for (let i = 0; i < key.length; i += 1) {
		hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
	}
	return hash;
}

export function getCapsuleGroupColorThemeId(
	capsuleKey: string,
): CapsuleGroupColorThemeId {
	const index =
		hashCapsuleKey(capsuleKey) % CAPSULE_GROUP_COLOR_THEME_IDS.length;
	return CAPSULE_GROUP_COLOR_THEME_IDS[index];
}
