import { GLOBALS_INSTANCE_ID } from "../capsules/core/validate-content";
import type { SchemaValues } from "../form-builder/core/types";
import { computePageChangeSet, countFieldChanges } from "../PageEditor/changes/diff-model";
import { resolveInstanceDefaults } from "../PageEditor/changes/schema-defaults";
import {
	isRemoteTimestampNewer,
	loadPageEditorDocumentFromCache,
	savePageEditorDocumentToCache
} from "../PageEditor/page-editor-cache";
import { loadPageEditorDocumentFromDb } from "../PageEditor/page-editor-documents";
import type { PageEditorValuesByInstance } from "../PageEditor/persistence";
import { GLOBALS_DOCUMENT_ID } from "./globals-persistence";

/*
 * The global variables' draft lives in the page cache under GLOBALS_DOCUMENT_ID, as a page
 * with a single instance (`{ globals: values }`). It autosaves, shows up on the Changes page
 * and is committed (with pages) exactly like a page draft.
 */

export type SyncedGlobalsDraft = {
	/** The draft, or null when it could not be loaded and this browser has none. */
	values: SchemaValues | null;
	/** Globals were committed elsewhere while this draft had edits; the edits were kept. */
	remoteChangedWhileDirty: boolean;
	errorMessage: string | null;
};

function globalsValues(valuesByInstance: PageEditorValuesByInstance): SchemaValues {
	return valuesByInstance[GLOBALS_INSTANCE_ID] ?? {};
}

/** The draft as cached in this browser, or null when it was never loaded here. */
export async function readCachedGlobalsDraft(): Promise<SchemaValues | null> {
	const cached = await loadPageEditorDocumentFromCache(GLOBALS_DOCUMENT_ID);
	return cached ? globalsValues(cached.valuesByInstance) : null;
}

/**
 * Loads the draft, first bringing it up to date with the committed globals: seeded when this
 * browser has none, replaced when it has no edits and a newer commit exists. With edits
 * pending, they are kept and only the baseline moves forward, like the Page Editor does.
 */
export async function syncGlobalsDraft(): Promise<SyncedGlobalsDraft> {
	const [cached, remote] = await Promise.all([
		loadPageEditorDocumentFromCache(GLOBALS_DOCUMENT_ID),
		loadPageEditorDocumentFromDb(GLOBALS_DOCUMENT_ID)
	]);

	if (remote.errorMessage) {
		const values = cached ? globalsValues(cached.valuesByInstance) : null;
		return { values, remoteChangedWhileDirty: false, errorMessage: remote.errorMessage };
	}
	if (cached && !isRemoteTimestampNewer(remote.updatedAt, cached.updatedAt)) {
		return { values: globalsValues(cached.valuesByInstance), remoteChangedWhileDirty: false, errorMessage: null };
	}

	const keepDraft =
		cached !== null &&
		countFieldChanges(
			computePageChangeSet(
				GLOBALS_DOCUMENT_ID,
				cached.baselineValuesByInstance,
				cached.valuesByInstance,
				resolveInstanceDefaults
			)
		) > 0;
	const valuesByInstance = keepDraft ? cached.valuesByInstance : remote.valuesByInstance;
	await savePageEditorDocumentToCache({
		pageId: GLOBALS_DOCUMENT_ID,
		valuesByInstance,
		baselineValuesByInstance: remote.valuesByInstance,
		updatedAt: remote.updatedAt
	});
	return { values: globalsValues(valuesByInstance), remoteChangedWhileDirty: keepDraft, errorMessage: null };
}
