import type { CapsuleManifestEntry } from "./types";

export interface PageInstance {
	instanceId: string;
	capsuleKey: string;
}

/** "test-capsule", 0 -> "test-capsule-01": the id content is stored under. */
export function capsuleInstanceId(capsuleKey: string, index: number): string {
	return `${capsuleKey}-${String(index + 1).padStart(2, "0")}`;
}

/**
 * Every capsule instance a page renders, per its manifest entries: each capsule's
 * occurrences are numbered across the page, in order (test-capsule-01, test-capsule-02, ...).
 */
export function listPageInstances(entries: CapsuleManifestEntry[]): PageInstance[] {
	const countByKey = new Map<string, number>();
	for (const entry of entries) {
		countByKey.set(entry.capsuleKey, (countByKey.get(entry.capsuleKey) ?? 0) + entry.occurrenceCount);
	}
	return [...countByKey].flatMap(([capsuleKey, count]) =>
		Array.from({ length: count }, (_, index) => ({ instanceId: capsuleInstanceId(capsuleKey, index), capsuleKey })),
	);
}
