import { get } from "svelte/store";
import { globalsSchema } from "virtual:capsulo/globals-schema";
import { DEFAULT_LOCALE } from "../config/i18n-config";
import { createSchemaInitialValues } from "../form-builder/renderer/schema-renderer-i18n";
import type { SchemaValues } from "../form-builder/core/types";
import { peekCachedGlobalsDraft, readCachedGlobalsDraft, syncGlobalsDraft } from "../globals/globals-draft";
import { GLOBALS_DOCUMENT_ID } from "../globals/globals-persistence";
import { withGlobalsDefaults } from "../globals/resolve-globals";
import { wrapGlobalsValues } from "../PageEditor/page-editor-documents";
import { savePageEditorDocumentToCache } from "../PageEditor/page-editor-cache";
import { hasFieldChanges } from "../PageEditor/changes/changed-pages";
import { session, ensureSession } from "../stores/session";

const DRAFT_PERSIST_DEBOUNCE_MS = 250;

type DocumentContext = {
	getValues: () => SchemaValues;
	setValues: (values: SchemaValues) => void;
};

function differ(before: SchemaValues, after: SchemaValues): boolean {
	return hasFieldChanges(GLOBALS_DOCUMENT_ID, wrapGlobalsValues(before), wrapGlobalsValues(after));
}

/**
 * The Global Variables editor's draft: edits autosave to the page cache like a page's, and
 * are reviewed and committed on the Changes page.
 */
export function createGlobalsEditorDocument(context: DocumentContext) {
	// A draft this session already read renders at once and is checked against the remote in
	// the background, instead of the form waiting on the network every visit.
	const warmValues = peekCachedGlobalsDraft();
	const knownUserId = get(session)?.user?.id ?? null;
	if (warmValues) context.setValues(withGlobalsDefaults(warmValues, DEFAULT_LOCALE));

	let isLoading = $state(warmValues === null);
	let isAuthenticated = $state(knownUserId !== null);
	let hasCheckedAuth = $state(knownUserId !== null);
	let loadError = $state<string | null>(null);
	let remoteChangedWhileDirty = $state(false);
	/** False when nothing could be loaded: autosaving would store schema defaults as a draft. */
	let canPersist = $state(warmValues !== null);
	/** Autosaving the warm draft before the sync could undo a newer remote it brings in. */
	let isSyncingWarmDraft = $state(warmValues !== null);
	let schemaHydrationVersion = $state(0);
	let showAllErrors = $state(false);

	function applyHydratedValues(nextValues: SchemaValues): void {
		context.setValues(withGlobalsDefaults(nextValues, DEFAULT_LOCALE));
		schemaHydrationVersion += 1;
	}

	/** Lays a synced draft over the warm one without discarding anything typed meanwhile. */
	function applySyncedOverWarm(shown: SchemaValues, synced: SchemaValues, remoteMoved: boolean): void {
		const syncedDiffers = differ(shown, synced);
		if (differ(shown, context.getValues())) {
			// Edited during the sync: the edits are kept and autosave onto the new baseline.
			remoteChangedWhileDirty = remoteMoved || syncedDiffers;
			return;
		}
		remoteChangedWhileDirty = remoteMoved;
		if (syncedDiffers) applyHydratedValues(synced);
	}

	async function loadGlobalsDocument(): Promise<void> {
		const shownValues = isLoading ? null : warmValues;
		if (!shownValues) {
			isLoading = true;
			hasCheckedAuth = false;
		}
		loadError = null;
		remoteChangedWhileDirty = false;

		let userId = get(session)?.user?.id ?? null;
		if (!userId) {
			await ensureSession();
			userId = get(session)?.user?.id ?? null;
		}

		isAuthenticated = Boolean(userId);
		hasCheckedAuth = true;

		if (!userId) {
			applyHydratedValues(createSchemaInitialValues(globalsSchema, DEFAULT_LOCALE));
			isSyncingWarmDraft = false;
			isLoading = false;
			return;
		}

		const result = await syncGlobalsDraft();
		loadError = result.errorMessage;
		canPersist = result.values !== null;
		if (shownValues && result.values) {
			applySyncedOverWarm(shownValues, result.values, result.remoteChangedWhileDirty);
		} else {
			remoteChangedWhileDirty = result.remoteChangedWhileDirty;
			applyHydratedValues(result.values ?? {});
		}
		isSyncingWarmDraft = false;
		isLoading = false;
	}

	function setupDraftPersistenceEffect(): void {
		$effect(() => {
			const values = context.getValues();
			if (isLoading || isSyncingWarmDraft || !isAuthenticated || !canPersist) return;

			const timeoutId = window.setTimeout(() => {
				void savePageEditorDocumentToCache({
					pageId: GLOBALS_DOCUMENT_ID,
					valuesByInstance: wrapGlobalsValues(values),
				});
			}, DRAFT_PERSIST_DEBOUNCE_MS);

			return () => window.clearTimeout(timeoutId);
		});
	}

	setupDraftPersistenceEffect();

	function initialize(): void {
		void loadGlobalsDocument();
	}

	/**
	 * Picks up a draft rewritten outside the editor (the AI agent, or undoing its edit).
	 * The debounced autosave then stores the same values back, which is a no-op.
	 */
	async function reloadDraft(): Promise<void> {
		if (isLoading) return;
		const values = await readCachedGlobalsDraft();
		if (values) applyHydratedValues(values);
	}

	return {
		get isLoading() {
			return isLoading;
		},
		get isAuthenticated() {
			return isAuthenticated;
		},
		get hasCheckedAuth() {
			return hasCheckedAuth;
		},
		get loadError() {
			return loadError;
		},
		get remoteChangedWhileDirty() {
			return remoteChangedWhileDirty;
		},
		get schemaHydrationVersion() {
			return schemaHydrationVersion;
		},
		get showAllErrors() {
			return showAllErrors;
		},
		/** Show every error now, e.g. when opened from a "fix this" link. */
		revealErrors() {
			showAllErrors = true;
		},
		initialize,
		reloadDraft,
	};
}
