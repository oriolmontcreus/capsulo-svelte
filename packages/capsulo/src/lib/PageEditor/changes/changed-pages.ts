import { loadAllPageEditorCacheDocuments, peekAllPageEditorDocuments } from "../page-editor-cache";
import type { PageEditorCachedDocument, PageEditorValuesByInstance } from "../persistence";
import { computePageChangeSet, countFieldChanges, type PageChangeSet } from "./diff-model";
import { resolveInstanceDefaults } from "./schema-defaults";
import { GLOBALS_DOCUMENT_ID } from "../../globals/globals-persistence";
import { t } from "../../admin-i18n/i18n.svelte";

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
	if (pageId === GLOBALS_DOCUMENT_ID) return t("globals.title");
	const lastSegment = pageId.split("/").pop() ?? pageId;
	return lastSegment
		.split("-")
		.map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
		.join(" ");
}

/** Whether two versions of a page differ in any field, ignoring values that only fill in defaults. */
export function hasFieldChanges(
	pageId: string,
	before: PageEditorValuesByInstance,
	after: PageEditorValuesByInstance
): boolean {
	return countFieldChanges(computePageChangeSet(pageId, before, after, resolveInstanceDefaults)) > 0;
}

/** Every page in `documents` whose draft differs from its committed baseline. */
export function summarizeChangedPages(documents: PageEditorCachedDocument[]): ChangedPageSummary[] {
	const summaries: ChangedPageSummary[] = [];

	for (const document of documents) {
		const changeSet = computePageChangeSet(
			document.pageId,
			document.baselineValuesByInstance,
			document.valuesByInstance,
			resolveInstanceDefaults
		);
		const count = countFieldChanges(changeSet);
		if (count === 0) continue;

		summaries.push({
			pageId: document.pageId,
			name: pageDisplayName(document.pageId),
			count
		});
	}

	// The global variables first, then pages by name.
	return summaries.sort(
		(a, b) =>
			Number(b.pageId === GLOBALS_DOCUMENT_ID) - Number(a.pageId === GLOBALS_DOCUMENT_ID) ||
			a.name.localeCompare(b.name)
	);
}

/**
 * Lists every page whose local draft differs from its committed baseline.
 * Purely local: reads the IndexedDB cache, no network calls.
 */
export async function listChangedPages(): Promise<ChangedPageSummary[]> {
	return summarizeChangedPages(await loadAllPageEditorCacheDocuments());
}

function changeSetOf(document: PageEditorCachedDocument | undefined): PageChangeSet | null {
	if (!document) return null;
	return computePageChangeSet(
		document.pageId,
		document.baselineValuesByInstance,
		document.valuesByInstance,
		resolveInstanceDefaults
	);
}

/**
 * Computes the full change set for a single page from the local cache.
 * Returns null if the page has no cache entry. Resolves synchronously (a plain value)
 * when this session already holds every cached row.
 */
export function getPageChangeSet(pageId: string): PageChangeSet | null | Promise<PageChangeSet | null> {
	const inMemory = peekAllPageEditorDocuments();
	if (inMemory) return changeSetOf(inMemory.find((entry) => entry.pageId === pageId));
	return loadAllPageEditorCacheDocuments().then((documents) =>
		changeSetOf(documents.find((entry) => entry.pageId === pageId))
	);
}
