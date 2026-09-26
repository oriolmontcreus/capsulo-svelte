import {
	loadPageEditorDocumentFromCache,
	savePageEditorDocumentToCache
} from "$lib/PageEditor/page-editor-cache";
import { loadPageEditorDocumentFromDb } from "$lib/PageEditor/page-editor-documents";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
import { setDraftFieldValue, type DraftFieldTarget } from "./draft-values";

/**
 * Dispatched after any draft write so the AdminNav dirty-count badge and an open
 * Changes page can refresh without polling IndexedDB.
 */
export const CHANGES_UPDATED_EVENT = "capsulo:changes-updated";

/**
 * Dispatched (with `{ pageId }`) when something other than the Page Editor rewrote a
 * page's draft (the AI agent, or undoing one of its edits), so an open editor reloads it.
 */
export const DRAFT_REPLACED_EVENT = "capsulo:draft-replaced";

export type DraftReplacedDetail = { pageId: string };

export type DraftWriteResult = {
	ok: boolean;
	errorMessage: string | null;
};

type DraftSnapshot = {
	valuesByInstance: PageEditorValuesByInstance;
	baselineValuesByInstance: PageEditorValuesByInstance;
	updatedAt: string | null;
	errorMessage: string | null;
};

function dispatchChangesUpdated(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent(CHANGES_UPDATED_EVENT));
}

/**
 * Returns the page's local draft, seeding it from the committed remote content
 * when this browser has never opened the page.
 *
 * The legacy CMS gave up at this point (`if (!draft) return false`), so
 * recovering a value from history onto an untouched page silently did nothing.
 */
async function loadOrSeedDraft(pageId: string): Promise<DraftSnapshot> {
	const cached = await loadPageEditorDocumentFromCache(pageId);
	if (cached) {
		return {
			valuesByInstance: cached.valuesByInstance,
			baselineValuesByInstance: cached.baselineValuesByInstance,
			updatedAt: cached.updatedAt,
			errorMessage: null
		};
	}

	const remote = await loadPageEditorDocumentFromDb(pageId);
	if (remote.errorMessage) {
		return {
			valuesByInstance: {},
			baselineValuesByInstance: {},
			updatedAt: null,
			errorMessage: remote.errorMessage
		};
	}

	// Never committed and never cached: there is no baseline to diff against.
	return {
		valuesByInstance: remote.valuesByInstance,
		baselineValuesByInstance: remote.valuesByInstance,
		updatedAt: remote.updatedAt,
		errorMessage: null
	};
}

async function writeDraft(
	pageId: string,
	valuesByInstance: PageEditorValuesByInstance,
	snapshot: DraftSnapshot
): Promise<DraftWriteResult> {
	try {
		await savePageEditorDocumentToCache({
			pageId,
			valuesByInstance,
			// Keep the committed baseline so the write shows up as a pending change.
			baselineValuesByInstance: snapshot.baselineValuesByInstance,
			updatedAt: snapshot.updatedAt
		});
	} catch (error) {
		return {
			ok: false,
			errorMessage: error instanceof Error ? error.message : "Failed to update the local draft."
		};
	}

	dispatchChangesUpdated();
	return { ok: true, errorMessage: null };
}

/** The page's current draft values (seeded from the committed content if it has no draft yet). */
export async function readPageDraft(
	pageId: string
): Promise<{ valuesByInstance: PageEditorValuesByInstance; errorMessage: string | null }> {
	const snapshot = await loadOrSeedDraft(pageId);
	return { valuesByInstance: snapshot.valuesByInstance, errorMessage: snapshot.errorMessage };
}

/**
 * Rewrites the page's draft with `update(current)` and tells an open Page Editor to
 * reload it. Used by the AI agent, whose edits land in the draft like manual ones.
 */
export async function updatePageDraft(
	pageId: string,
	update: (current: PageEditorValuesByInstance) => PageEditorValuesByInstance
): Promise<DraftWriteResult> {
	const snapshot = await loadOrSeedDraft(pageId);
	if (snapshot.errorMessage) return { ok: false, errorMessage: snapshot.errorMessage };

	const result = await writeDraft(pageId, update(snapshot.valuesByInstance), snapshot);
	if (result.ok && typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent<DraftReplacedDetail>(DRAFT_REPLACED_EVENT, { detail: { pageId } })
		);
	}
	return result;
}

/**
 * Writes a single field/locale value into the page's draft. Used by Recover
 * (History page, pulls an old value forward) and Revert (Changes page, drops a
 * pending edit). Both stage into the draft so the change is reviewed and
 * committed through the normal flow rather than written straight to the database.
 */
export async function applyFieldValueToDraft(
	pageId: string,
	target: DraftFieldTarget,
	value: unknown
): Promise<DraftWriteResult> {
	const snapshot = await loadOrSeedDraft(pageId);
	if (snapshot.errorMessage) return { ok: false, errorMessage: snapshot.errorMessage };

	const next = setDraftFieldValue(snapshot.valuesByInstance, target, value);
	return writeDraft(pageId, next, snapshot);
}

/**
 * Replaces the page's whole draft with a past revision's content. Instances that
 * exist in the draft but not in the revision are dropped, because the revision is
 * a full snapshot of the page at that point in time.
 */
export async function restoreRevisionToDraft(
	pageId: string,
	valuesByInstance: PageEditorValuesByInstance
): Promise<DraftWriteResult> {
	const snapshot = await loadOrSeedDraft(pageId);
	if (snapshot.errorMessage) return { ok: false, errorMessage: snapshot.errorMessage };

	return writeDraft(pageId, valuesByInstance, snapshot);
}
