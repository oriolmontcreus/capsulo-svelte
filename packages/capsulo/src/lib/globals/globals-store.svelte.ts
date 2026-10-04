import { DEFAULT_LOCALE } from "../config/i18n-config";
import type { SchemaValues } from "../form-builder/core/types";
import { onChangesUpdated } from "../PageEditor/page-editor-cache";
import { t } from "../admin-i18n/i18n.svelte";

import { readCachedGlobalsDraft, syncGlobalsDraft } from "./globals-draft";
import { withGlobalsDefaults } from "./resolve-globals";

/**
 * The global variables as currently drafted (what the next commit would publish), which is
 * what the Page Editor previews and offers as `{{variables}}`.
 */
export const globalsStore = $state({
	values: {} as SchemaValues,
	loaded: false,
});

let inflightLoad: Promise<SchemaValues> | null = null;

function setGlobalsValues(values: SchemaValues): void {
	globalsStore.values = withGlobalsDefaults(values, DEFAULT_LOCALE);
	globalsStore.loaded = true;
}

/** Follows every later draft write (this editor, another tab, the AI agent). */
function followDraftChanges(): void {
	onChangesUpdated(async () => {
		const values = await readCachedGlobalsDraft();
		if (values) setGlobalsValues(values);
	});
}

export async function ensureGlobalsLoaded(): Promise<SchemaValues> {
	if (globalsStore.loaded) return globalsStore.values;
	if (inflightLoad) return inflightLoad;

	inflightLoad = (async () => {
		const result = await syncGlobalsDraft();
		if (!result.values) throw new Error(result.errorMessage ?? t("globals.loadFailedGeneric"));

		setGlobalsValues(result.values);
		followDraftChanges();
		return globalsStore.values;
	})();

	try {
		return await inflightLoad;
	} finally {
		inflightLoad = null;
	}
}
