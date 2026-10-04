import type { CapsuleManifestEntry } from "$lib/capsules/core/types";
import type { GroupedCapsuleEntry } from "./types";

export function groupManifestEntries(
	entries: CapsuleManifestEntry[],
): GroupedCapsuleEntry[] {
	const grouped: Record<string, GroupedCapsuleEntry> = {};

	entries.forEach((entry, entryIndex) => {
		const existing = grouped[entry.capsuleKey];
		if (existing) {
			existing.entries.push({ entry, entryIndex });
			return;
		}

		grouped[entry.capsuleKey] = {
			capsuleKey: entry.capsuleKey,
			entries: [{ entry, entryIndex }],
		};
	});

	return Object.values(grouped);
}
