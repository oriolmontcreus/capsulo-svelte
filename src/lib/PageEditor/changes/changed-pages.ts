import { loadAllPageEditorCacheDocuments } from "$lib/PageEditor/page-editor-cache";
import { computePageChangeSet, countFieldChanges, type PageChangeSet } from "./diff-model";

export type ChangedPageSummary = {
	pageId: string;
	name: string;
	count: number;
};

/**
 * Turns a page id (e.g. "blog/random-entry") into a friendly display name,
 * matching the formatting used by the Page Editor index.
 */
export function pageDisplayName(pageId: string): string {
	const lastSegment = pageId.split("/").pop() ?? pageId;
	return lastSegment
		.split("-")
		.map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
		.join(" ");
}

/**
 * Lists every page whose local draft differs from its committed baseline.
 * Purely local: reads the IndexedDB cache, no network calls.
 */
export async function listChangedPages(): Promise<ChangedPageSummary[]> {
	const documents = await loadAllPageEditorCacheDocuments();
	const summaries: ChangedPageSummary[] = [];

	for (const document of documents) {
		const changeSet = computePageChangeSet(
			document.pageId,
			document.baselineValuesByInstance,
			document.valuesByInstance
		);
		const count = countFieldChanges(changeSet);
		if (count === 0) continue;

		summaries.push({
			pageId: document.pageId,
			name: pageDisplayName(document.pageId),
			count
		});
	}

	return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Computes the full change set for a single page from the local cache.
 * Returns null if the page has no cache entry.
 */
export async function getPageChangeSet(pageId: string): Promise<PageChangeSet | null> {
	const documents = await loadAllPageEditorCacheDocuments();
	const document = documents.find((entry) => entry.pageId === pageId);
	if (!document) return null;
	return computePageChangeSet(
		pageId,
		document.baselineValuesByInstance,
		document.valuesByInstance
	);
}
