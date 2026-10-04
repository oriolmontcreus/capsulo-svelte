import { get } from "svelte/store";
import { globalsSchema } from "virtual:capsulo/globals-schema";
import { DEFAULT_LOCALE } from "../config/i18n-config";
import { createSchemaInitialValues } from "../form-builder/renderer/schema-renderer-i18n";
import type { SchemaValues } from "../form-builder/core/types";
import {
	ensureGlobalsLoaded,
	globalsStore,
	setGlobalsValues,
} from "../globals/globals-store.svelte";
import { saveGlobalsDocumentToDb } from "../globals/globals-documents";
import { clearGlobalsDraft, loadGlobalsDraft, saveGlobalsDraft } from "../globals/globals-draft";
import { computePageChangeSet, countFieldChanges } from "../PageEditor/changes/diff-model";
import { validateGlobalsContent, type ContentIssue } from "../capsules/core/validate-content";
import { VALIDATION_OPTIONS } from "../PageEditor/validate-documents";
import { session, ensureSession } from "../stores/session";
import { t } from "../admin-i18n/i18n.svelte";

const DRAFT_PERSIST_DEBOUNCE_MS = 250;

function valuesDiffer(saved: SchemaValues, current: SchemaValues): boolean {
	const changeSet = computePageChangeSet("globals", { globals: saved }, { globals: current });
	return countFieldChanges(changeSet) > 0;
}

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
	let hasUnsavedChanges = $state(false);
	/** Set by a blocked save; cleared once the values are valid again. */
	let validationIssues = $state<ContentIssue[]>([]);
	let showAllErrors = $state(false);

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
			await ensureSession();
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
			const savedValues = await ensureGlobalsLoaded();
			// Unsaved edits (yours or the AI agent's) survive leaving the page.
			const draft = await loadGlobalsDraft();
			const draftDiffers = draft !== null && valuesDiffer(savedValues, draft.values);
			applyHydratedValues(draftDiffers ? draft.values : savedValues);
			hasUnsavedChanges = draftDiffers;
			if (draft && !draftDiffers) void clearGlobalsDraft();
			hasExistingDocument = globalsStore.hasExistingDocument;
		} catch (error) {
			loadError = error instanceof Error ? error.message : t("globals.loadFailedGeneric");
		}
		isLoading = false;
		syncSaveState();
	}

	async function saveGlobalsDocument(): Promise<void> {
		if (!currentUserId || context.getIsSaving() || !isAuthenticated) return;

		// Same rules the API enforces: required fields filled, formats right.
		const issues = validateGlobalsContent(globalsSchema, context.getValues(), VALIDATION_OPTIONS);
		validationIssues = issues;
		if (issues.length > 0) {
			showAllErrors = true;
			return;
		}

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
		await clearGlobalsDraft();
		hasUnsavedChanges = false;
		context.setIsSaving(false);
		syncSaveState();
	}

	function setupValidationEffect(): void {
		// After a blocked save, keep the list current as fields get fixed.
		$effect(() => {
			const values = context.getValues();
			if (!showAllErrors) return;
			validationIssues = validateGlobalsContent(globalsSchema, values, VALIDATION_OPTIONS);
		});
	}

	function setupSaveStateEffect(): void {
		$effect(() => {
			isAuthenticated;
			isLoading;
			context.getIsSaving();
			syncSaveState();
		});
	}

	function setupDraftPersistenceEffect(): void {
		$effect(() => {
			const values = context.getValues();
			if (isLoading || !isAuthenticated || !globalsStore.loaded) return;

			const timeoutId = window.setTimeout(() => {
				const differs = valuesDiffer(globalsStore.values, values);
				hasUnsavedChanges = differs;
				void (differs ? saveGlobalsDraft(values) : clearGlobalsDraft());
			}, DRAFT_PERSIST_DEBOUNCE_MS);

			return () => window.clearTimeout(timeoutId);
		});
	}

	setupSaveStateEffect();
	setupDraftPersistenceEffect();
	setupValidationEffect();

	function initialize(): void {
		syncSaveState();
		void loadGlobalsDocument();
	}

	/** Picks up a draft written by the AI agent (or undoing its edit) while the editor is open. */
	async function reloadDraft(): Promise<void> {
		if (isLoading) return;
		const draft = await loadGlobalsDraft();
		applyHydratedValues(draft?.values ?? globalsStore.values);
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
		get hasUnsavedChanges() {
			return hasUnsavedChanges;
		},
		get validationIssues() {
			return validationIssues;
		},
		get showAllErrors() {
			return showAllErrors;
		},
		/** Show every error now, e.g. when opened from a "fix this" link. */
		revealErrors() {
			showAllErrors = true;
		},
		saveGlobalsDocument,
		initialize,
		reloadDraft,
	};
}
