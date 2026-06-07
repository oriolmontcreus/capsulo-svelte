import { get } from "svelte/store";
import { globalsSchema } from "$/config/globals/globals.schema";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import { createSchemaInitialValues } from "$lib/form-builder/renderer/schema-renderer-i18n";
import type { SchemaValues } from "$lib/form-builder/core/types";
import {
	ensureGlobalsLoaded,
	globalsStore,
	setGlobalsValues,
} from "$lib/globals/globals-store.svelte";
import { saveGlobalsDocumentToDb } from "$lib/globals/globals-documents";
import { session, syncSession } from "$lib/stores/session";

type DocumentContext = {
	getValues: () => SchemaValues;
	setValues: (values: SchemaValues) => void;
	getSaveDisabled: () => boolean;
	setSaveDisabled: (disabled: boolean) => void;
	getIsSaving: () => boolean;
	setIsSaving: (isSaving: boolean) => void;
};

export function createGlobalsEditorDocument(context: DocumentContext) {
	let isLoading = $state(true);
	let isAuthenticated = $state(false);
	let hasCheckedAuth = $state(false);
	let currentUserId = $state<string | null>(null);
	let hasExistingDocument = $state(false);
	let loadError = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let schemaHydrationVersion = $state(0);

	function applyHydratedValues(nextValues: SchemaValues): void {
		context.setValues(nextValues);
		schemaHydrationVersion += 1;
	}

	function syncSaveState(): void {
		context.setSaveDisabled(!isAuthenticated || isLoading || context.getIsSaving());
	}

	async function loadGlobalsDocument(): Promise<void> {
		isLoading = true;
		hasCheckedAuth = false;
		loadError = null;
		saveError = null;
		hasExistingDocument = false;

		let userId = get(session)?.user?.id ?? null;
		if (!userId) {
			await syncSession();
			userId = get(session)?.user?.id ?? null;
		}

		isAuthenticated = Boolean(userId);
		currentUserId = userId;
		hasCheckedAuth = true;

		if (!userId) {
			applyHydratedValues(createSchemaInitialValues(globalsSchema, DEFAULT_LOCALE));
			isLoading = false;
			syncSaveState();
			return;
		}

		try {
			const nextValues = await ensureGlobalsLoaded();
			applyHydratedValues(nextValues);
			hasExistingDocument = globalsStore.hasExistingDocument;
		} catch (error) {
			loadError = error instanceof Error ? error.message : "Failed to load global variables";
		}
		isLoading = false;
		syncSaveState();
	}

	async function saveGlobalsDocument(): Promise<void> {
		if (!currentUserId || context.getIsSaving() || !isAuthenticated) return;

		context.setIsSaving(true);
		saveError = null;
		syncSaveState();

		const saveResult = await saveGlobalsDocumentToDb({
			userId: currentUserId,
			values: context.getValues(),
			hasExistingDocument,
		});

		if (saveResult.errorMessage) {
			saveError = saveResult.errorMessage;
			context.setIsSaving(false);
			syncSaveState();
			return;
		}

		hasExistingDocument = true;
		setGlobalsValues(context.getValues(), { hasExistingDocument: true });
		context.setIsSaving(false);
		syncSaveState();
	}

	function setupSaveStateEffect(): void {
		$effect(() => {
			isAuthenticated;
			isLoading;
			context.getIsSaving();
			syncSaveState();
		});
	}

	setupSaveStateEffect();

	function initialize(): void {
		syncSaveState();
		void loadGlobalsDocument();
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
		get saveError() {
			return saveError;
		},
		get schemaHydrationVersion() {
			return schemaHydrationVersion;
		},
		saveGlobalsDocument,
		initialize,
	};
}
