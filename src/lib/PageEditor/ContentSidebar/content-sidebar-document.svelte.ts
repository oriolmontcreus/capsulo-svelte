import { get } from "svelte/store";
import { session, syncSession } from "$lib/stores/session";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
import {
	loadPageEditorDocumentFromCache,
	savePageEditorDocumentToCache,
} from "$lib/PageEditor/page-editor-cache";
import {
	loadPageEditorDocumentFromDb,
	loadPageEditorDocumentMetadataFromDb,
	savePageEditorDocumentToDb,
} from "$lib/PageEditor/page-editor-documents";
import type { SchemaValues } from "$lib/form-builder/core/types";
import { flushPendingUploads } from "$lib/form-builder/fields/FileUploadField/upload-staging";
import type { PageEditorSaveControls } from "./types";

const CACHE_PERSIST_DEBOUNCE_MS = 250;

function isRemoteTimestampNewer(
	remoteUpdatedAt: string | null,
	cacheUpdatedAt: string | null,
): boolean {
	if (!remoteUpdatedAt) return false;
	if (!cacheUpdatedAt) return true;
	const remoteMs = Date.parse(remoteUpdatedAt);
	const cacheMs = Date.parse(cacheUpdatedAt);
	if (Number.isNaN(remoteMs) || Number.isNaN(cacheMs))
		return remoteUpdatedAt !== cacheUpdatedAt;
	return remoteMs > cacheMs;
}

type DocumentContext = {
	getPageId: () => string;
	getValuesByInstance: () => PageEditorValuesByInstance;
	setValuesByInstance: (values: PageEditorValuesByInstance) => void;
	getSaveControls: () => PageEditorSaveControls;
	setSaveControls: (controls: PageEditorSaveControls) => void;
};

export function createContentSidebarDocument(context: DocumentContext) {
	let isLoading = $state(true);
	let isBlockingLoad = $state(false);
	let isSyncing = $state(false);
	let isSaving = $state(false);
	let isAuthenticated = $state(false);
	let hasCheckedAuth = $state(false);
	let currentUserId = $state<string | null>(null);
	let hasExistingDocument = $state(false);
	let loadError = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let schemaHydrationVersion = $state(0);
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

		isLoading = true;
		isBlockingLoad = false;
		isSyncing = false;
		hasCheckedAuth = false;
		loadError = null;
		saveError = null;
		hasExistingDocument = false;

		const cachedDocument = await loadPageEditorDocumentFromCache(pageId);
		if (!isCurrentRun()) return;

		if (cachedDocument) {
			applyHydratedValues(cachedDocument.valuesByInstance);
			hasExistingDocument =
				Boolean(cachedDocument.updatedAt) ||
				Object.keys(cachedDocument.valuesByInstance).length > 0;
			isLoading = false;
			isBlockingLoad = false;
			isSyncing = true;

			let userId = get(session)?.user?.id ?? null;
			if (!userId) {
				await syncSession();
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
			applyHydratedValues(remoteLoadResult.valuesByInstance);
			hasExistingDocument = remoteLoadResult.hasExistingDocument;
			await savePageEditorDocumentToCache({
				pageId,
				valuesByInstance: remoteLoadResult.valuesByInstance,
				updatedAt: remoteLoadResult.updatedAt,
			});
			isSyncing = false;
			return;
		}

		isBlockingLoad = true;
		let userId = get(session)?.user?.id ?? null;
		if (!userId) {
			await syncSession();
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

		// Apply any staged FileUpload changes (bucket uploads/deletes) and commit
		// their resolved values into the form state before persisting.
		try {
			await flushPendingUploads();
		} catch (flushError) {
			saveError =
				flushError instanceof Error
					? flushError.message
					: "Failed to apply file changes.";
			isSaving = false;
			syncSaveControls();
			return;
		}

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
		await savePageEditorDocumentToCache({
			pageId: context.getPageId(),
			valuesByInstance: context.getValuesByInstance(),
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
			if (!pageId || isLoading) return;
			context.getValuesByInstance();

			const timeoutId = window.setTimeout(() => {
				void savePageEditorDocumentToCache({
					pageId,
					valuesByInstance: context.getValuesByInstance(),
					updatedAt: null,
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
		get schemaHydrationVersion() {
			return schemaHydrationVersion;
		},
		updateInstanceValues,
		initialize,
	};
}
