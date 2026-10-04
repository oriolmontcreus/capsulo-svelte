import { get } from "svelte/store";
import { session, ensureSession } from "../../stores/session";
import type { PageEditorCachedDocument, PageEditorValuesByInstance } from "../persistence";
import {
	isRemoteTimestampNewer,
	loadPageEditorDocumentFromCache,
	peekPageEditorDocument,
	savePageEditorDocumentToCache,
} from "../page-editor-cache";
import {
	loadPageEditorDocumentFromDb,
	loadPageEditorDocumentMetadataFromDb,
	savePageEditorDocumentToDb,
} from "../page-editor-documents";
import type { SchemaValues } from "../../form-builder/core/types";
import { hasFieldChanges } from "../changes/changed-pages";
import type { PageEditorSaveControls } from "./types";

const CACHE_PERSIST_DEBOUNCE_MS = 250;

type DocumentContext = {
	getPageId: () => string;
	getValuesByInstance: () => PageEditorValuesByInstance;
	setValuesByInstance: (values: PageEditorValuesByInstance) => void;
	getSaveControls: () => PageEditorSaveControls;
	setSaveControls: (controls: PageEditorSaveControls) => void;
};

function hasContent(document: PageEditorCachedDocument): boolean {
	return Boolean(document.updatedAt) || Object.keys(document.valuesByInstance).length > 0;
}

export function createContentSidebarDocument(context: DocumentContext) {
	// A draft this session already read renders in the first frame (no empty fields that
	// then remount); loadPageEditorDocument() still reconciles it with IndexedDB and the remote.
	const warmDocument = peekPageEditorDocument(context.getPageId());
	const knownUserId = get(session)?.user?.id ?? null;
	if (warmDocument) context.setValuesByInstance(warmDocument.valuesByInstance);

	let isLoading = $state(warmDocument === null);
	let isBlockingLoad = $state(false);
	let isSyncing = $state(false);
	let isSaving = $state(false);
	let isAuthenticated = $state(knownUserId !== null);
	let hasCheckedAuth = $state(knownUserId !== null);
	let currentUserId = $state<string | null>(knownUserId);
	let hasExistingDocument = $state(warmDocument ? hasContent(warmDocument) : false);
	let loadError = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let remoteChangedWhileDirty = $state(false);
	let schemaHydrationVersion = $state(0);
	/** Until the warm draft is checked against IndexedDB, autosaving it could undo another tab's write. */
	let isReconcilingWarmDraft = $state(warmDocument !== null);
	let latestLoadRunId = 0;

	function applyHydratedValues(nextValuesByInstance: PageEditorValuesByInstance): void {
		context.setValuesByInstance(nextValuesByInstance);
		schemaHydrationVersion += 1;
	}

	function syncSaveControls(): void {
		context.setSaveControls({
			save: savePageEditorDocument,
			disabled: !isAuthenticated || isBlockingLoad || isSaving,
			isSaving,
		});
	}

	async function loadPageEditorDocument(): Promise<void> {
		const pageId = context.getPageId();
		const loadRunId = ++latestLoadRunId;
		const isCurrentRun = () => loadRunId === latestLoadRunId;
		const shownDocument = isLoading ? null : warmDocument;

		if (!shownDocument) {
			isLoading = true;
			hasCheckedAuth = false;
			hasExistingDocument = false;
		}
		isBlockingLoad = false;
		isSyncing = false;
		loadError = null;
		saveError = null;
		remoteChangedWhileDirty = false;

		const cachedDocument = await loadPageEditorDocumentFromCache(pageId);
		if (!isCurrentRun()) return;
		isReconcilingWarmDraft = false;

		if (cachedDocument) {
			// Re-hydrating remounts every field, so only do it when another tab changed the draft.
			if (
				!shownDocument ||
				hasFieldChanges(pageId, shownDocument.valuesByInstance, cachedDocument.valuesByInstance)
			) {
				applyHydratedValues(cachedDocument.valuesByInstance);
			}
			hasExistingDocument = hasContent(cachedDocument);
			isLoading = false;
			isBlockingLoad = false;
			isSyncing = true;

			let userId = get(session)?.user?.id ?? null;
			if (!userId) {
				await ensureSession();
				userId = get(session)?.user?.id ?? null;
			}

			isAuthenticated = Boolean(userId);
			currentUserId = userId;
			hasCheckedAuth = true;
			if (!userId) {
				isSyncing = false;
				return;
			}

			const metadataResult = await loadPageEditorDocumentMetadataFromDb(pageId);
			if (!isCurrentRun()) return;

			if (metadataResult.errorMessage) {
				loadError = metadataResult.errorMessage;
				isSyncing = false;
				return;
			}

			hasExistingDocument = metadataResult.hasExistingDocument;
			const remoteIsNewer = isRemoteTimestampNewer(
				metadataResult.updatedAt,
				cachedDocument.updatedAt,
			);

			if (!remoteIsNewer) {
				isSyncing = false;
				return;
			}

			const remoteLoadResult = await loadPageEditorDocumentFromDb(pageId);
			if (!isCurrentRun()) return;

			if (remoteLoadResult.errorMessage) {
				loadError = remoteLoadResult.errorMessage;
				isSyncing = false;
				return;
			}

			loadError = null;
			hasExistingDocument = remoteLoadResult.hasExistingDocument;

			// What is on screen now: the editor may have typed while the remote loaded.
			const localValues = context.getValuesByInstance();
			const draftHasPendingEdits = hasFieldChanges(
				pageId,
				cachedDocument.baselineValuesByInstance,
				localValues,
			);

			if (draftHasPendingEdits) {
				// The page was committed elsewhere while edits were pending here. Those
				// edits only exist in this browser, so keep them and move the baseline
				// forward instead - overwriting would silently destroy uncommitted work.
				remoteChangedWhileDirty = true;
				await savePageEditorDocumentToCache({
					pageId,
					valuesByInstance: localValues,
					baselineValuesByInstance: remoteLoadResult.valuesByInstance,
					updatedAt: remoteLoadResult.updatedAt,
				});
				isSyncing = false;
				return;
			}

			if (hasFieldChanges(pageId, localValues, remoteLoadResult.valuesByInstance)) {
				applyHydratedValues(remoteLoadResult.valuesByInstance);
			}
			await savePageEditorDocumentToCache({
				pageId,
				valuesByInstance: remoteLoadResult.valuesByInstance,
				baselineValuesByInstance: remoteLoadResult.valuesByInstance,
				updatedAt: remoteLoadResult.updatedAt,
			});
			isSyncing = false;
			return;
		}

		isBlockingLoad = true;
		let userId = get(session)?.user?.id ?? null;
		if (!userId) {
			await ensureSession();
			userId = get(session)?.user?.id ?? null;
		}

		isAuthenticated = Boolean(userId);
		currentUserId = userId;
		hasCheckedAuth = true;

		if (!userId) {
			applyHydratedValues({});
			isLoading = false;
			isBlockingLoad = false;
			return;
		}

		const loadResult = await loadPageEditorDocumentFromDb(pageId);
		if (!isCurrentRun()) return;

		loadError = loadResult.errorMessage;
		applyHydratedValues(loadResult.valuesByInstance);
		hasExistingDocument = loadResult.hasExistingDocument;
		if (!loadResult.errorMessage) {
			await savePageEditorDocumentToCache({
				pageId,
				valuesByInstance: loadResult.valuesByInstance,
				baselineValuesByInstance: loadResult.valuesByInstance,
				updatedAt: loadResult.updatedAt,
			});
		}

		isLoading = false;
		isBlockingLoad = false;
	}

	async function savePageEditorDocument(): Promise<void> {
		if (!currentUserId || isSaving || !isAuthenticated) return;

		isSaving = true;
		saveError = null;
		syncSaveControls();


		const saveResult = await savePageEditorDocumentToDb({
			pageId: context.getPageId(),
			userId: currentUserId,
			valuesByInstance: context.getValuesByInstance(),
			hasExistingDocument,
		});

		if (saveResult.errorMessage) {
			saveError = saveResult.errorMessage;
			isSaving = false;
			syncSaveControls();
			return;
		}

		hasExistingDocument = true;
		// A successful save commits the current values, so they become the new
		// baseline and the page is no longer reported as having local changes.
		const savedValues = context.getValuesByInstance();
		await savePageEditorDocumentToCache({
			pageId: context.getPageId(),
			valuesByInstance: savedValues,
			baselineValuesByInstance: savedValues,
			updatedAt: saveResult.updatedAt,
		});
		isSaving = false;
		syncSaveControls();
	}

	function updateInstanceValues(instanceId: string, nextValues: SchemaValues): void {
		const current = context.getValuesByInstance();
		context.setValuesByInstance({
			...current,
			[instanceId]: nextValues,
		});
	}

	function setupCachePersistenceEffect(): void {
		$effect(() => {
			const pageId = context.getPageId();
			if (!pageId || isLoading || isReconcilingWarmDraft) return;
			context.getValuesByInstance();

			const timeoutId = window.setTimeout(() => {
				void savePageEditorDocumentToCache({
					pageId,
					valuesByInstance: context.getValuesByInstance(),
				});
			}, CACHE_PERSIST_DEBOUNCE_MS);

			return () => window.clearTimeout(timeoutId);
		});
	}

	function setupSaveControlsEffect(): void {
		$effect(() => {
			isAuthenticated;
			isBlockingLoad;
			isSaving;
			syncSaveControls();
		});
	}

	setupSaveControlsEffect();
	setupCachePersistenceEffect();

	function initialize(): void {
		syncSaveControls();
		void loadPageEditorDocument();
	}

	/**
	 * Picks up a draft rewritten outside the editor (the AI agent, or undoing its edit).
	 * The debounced cache write then stores the same values back, which is a no-op.
	 */
	async function reloadDraftFromCache(): Promise<void> {
		if (isLoading) return;
		const cachedDocument = await loadPageEditorDocumentFromCache(context.getPageId());
		if (cachedDocument) applyHydratedValues(cachedDocument.valuesByInstance);
	}

	return {
		get isLoading() {
			return isLoading;
		},
		get isBlockingLoad() {
			return isBlockingLoad;
		},
		get isSyncing() {
			return isSyncing;
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
		get saveError() {
			return saveError;
		},
		get remoteChangedWhileDirty() {
			return remoteChangedWhileDirty;
		},
		get schemaHydrationVersion() {
			return schemaHydrationVersion;
		},
		updateInstanceValues,
		initialize,
		reloadDraftFromCache,
	};
}
