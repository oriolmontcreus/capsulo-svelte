import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import type { SchemaValues } from "$lib/form-builder/core/types";

import { loadGlobalsDocumentFromDb } from "./globals-documents";
import { withGlobalsDefaults } from "./resolve-globals";

export const globalsStore = $state({
	values: {} as SchemaValues,
	loaded: false,
	hasExistingDocument: false,
});

let inflightLoad: Promise<SchemaValues> | null = null;

export function setGlobalsValues(
	values: SchemaValues,
	options?: { hasExistingDocument?: boolean }
): void {
	globalsStore.values = values;
	globalsStore.loaded = true;
	if (options?.hasExistingDocument !== undefined) {
		globalsStore.hasExistingDocument = options.hasExistingDocument;
	}
}

export async function ensureGlobalsLoaded(): Promise<SchemaValues> {
	if (globalsStore.loaded) return globalsStore.values;
	if (inflightLoad) return inflightLoad;

	inflightLoad = (async () => {
		const result = await loadGlobalsDocumentFromDb();
		if (result.errorMessage) throw new Error(result.errorMessage);

		const values = withGlobalsDefaults(result.hasExistingDocument ? result.values : null, DEFAULT_LOCALE);
		setGlobalsValues(values, { hasExistingDocument: result.hasExistingDocument });
		return values;
	})();

	try {
		return await inflightLoad;
	} finally {
		inflightLoad = null;
	}
}
