import type { PageEditorCachedDocument } from "$lib/PageEditor/persistence";
import { computePageChangeSet, countFieldChanges, type InstanceDefaultsResolver } from "./diff-model";

/**
 * Pure selection of which requested pages actually have something to commit:
 * the page must have a cache entry AND its draft must differ from its baseline.
 * Returns the cache documents for the committable pages, in request order.
 *
 * Kept Supabase-free (separate from commit.ts) so the skip-empty guard is
 * testable without pulling in the browser Supabase client.
 */
export function selectCommittableDocuments(
	documents: PageEditorCachedDocument[],
	pageIds: string[],
	resolveDefaults?: InstanceDefaultsResolver
): PageEditorCachedDocument[] {
	const byId = new Map(documents.map((document) => [document.pageId, document]));
	const committable: PageEditorCachedDocument[] = [];

	for (const pageId of pageIds) {
		const document = byId.get(pageId);
		if (!document) continue;
		const changeSet = computePageChangeSet(
			pageId,
			document.baselineValuesByInstance,
			document.valuesByInstance,
			resolveDefaults
		);
		if (countFieldChanges(changeSet) === 0) continue;
		committable.push(document);
	}

	return committable;
}
