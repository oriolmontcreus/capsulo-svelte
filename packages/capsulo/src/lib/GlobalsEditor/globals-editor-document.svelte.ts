import { get } from "svelte/store";
import { globalsSchema } from "virtual:capsulo/globals-schema";
import { DEFAULT_LOCALE } from "../config/i18n-config";
import { createSchemaInitialValues } from "../form-builder/renderer/schema-renderer-i18n";
import type { SchemaValues } from "../form-builder/core/types";
import { readCachedGlobalsDraft, syncGlobalsDraft } from "../globals/globals-draft";
import { GLOBALS_DOCUMENT_ID } from "../globals/globals-persistence";
import { withGlobalsDefaults } from "../globals/resolve-globals";
import { wrapGlobalsValues } from "../PageEditor/page-editor-documents";
import { savePageEditorDocumentToCache } from "../PageEditor/page-editor-cache";
import { session, ensureSession } from "../stores/session";

const DRAFT_PERSIST_DEBOUNCE_MS = 250;

type DocumentContext = {
	getValues: () => SchemaValues;
	setValues: (values: SchemaValues) => void;
};

/**
 * The Global Variables editor's draft: edits autosave to the page cache like a page's, and
 * are reviewed and committed on the Changes page.
 */
export function createGlobalsEditorDocument(context: DocumentContext) {
	let isLoading = $state(true);
	let isAuthenticated = $state(false);
	let hasCheckedAuth = $state(false);
	let loadError = $state<string | null>(null);
	let remoteChangedWhileDirty = $state(false);
	/** False when nothing could be loaded: autosaving would store schema defaults as a draft. */
	let canPersist = $state(false);
	let schemaHydrationVersion = $state(0);
	let showAllErrors = $state(false);

	function applyHydratedValues(nextValues: SchemaValues): void {
		context.setValues(withGlobalsDefaults(nextValues, DEFAULT_LOCALE));
		schemaHydrationVersion += 1;
	}

	async function loadGlobalsDocument(): Promise<void> {
		isLoading = true;
		hasCheckedAuth = false;
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
			isLoading = false;
			return;
		}

		const result = await syncGlobalsDraft();
		loadError = result.errorMessage;
		remoteChangedWhileDirty = result.remoteChangedWhileDirty;
		canPersist = result.values !== null;
		applyHydratedValues(result.values ?? {});
		isLoading = false;
	}

	function setupDraftPersistenceEffect(): void {
		$effect(() => {
			const values = context.getValues();
			if (isLoading || !isAuthenticated || !canPersist) return;

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
