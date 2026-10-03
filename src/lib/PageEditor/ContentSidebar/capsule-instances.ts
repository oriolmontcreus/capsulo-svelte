import { capsuleInstanceId } from "$lib/capsules/core/page-instances";
import { getCapsuleByKey } from "$lib/capsules/core/registry";
import type { GroupedCapsuleEntry } from "./types";

export function getCapsuleDisplayTitle(
	capsuleKey: string,
	componentName: string,
): string {
	const capsule = getCapsuleByKey(capsuleKey);
	return capsule?.meta?.displayName ?? componentName ?? capsuleKey;
}

export function buildCapsuleInstanceData(group: GroupedCapsuleEntry): {
	flatInstanceKeys: string[];
	instanceIds: string[];
} {
	const flatInstanceKeys = group.entries.flatMap((entryItem) =>
		Array.from(
			{ length: entryItem.entry.occurrenceCount },
			(_, occurrenceIndex) =>
				`${entryItem.entryIndex}-${occurrenceIndex}`,
		),
	);

	const instanceIds = flatInstanceKeys.map((_, instanceIndex) =>
		capsuleInstanceId(group.capsuleKey, instanceIndex),
	);

	return { flatInstanceKeys, instanceIds };
}
