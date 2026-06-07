import { globalsSchema } from "$/config/globals/globals.schema";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import { createSchemaInitialValues } from "$lib/form-builder/renderer/schema-renderer-i18n";
import type { SchemaValues } from "$lib/form-builder/core/types";

import { loadGlobalsDocumentFromDb } from "./globals-documents";

export const globalsStore = $state({
	values: {} as SchemaValues,
	loaded: false,
	hasExistingDocument: false,
});

let inflightLoad: Promise<SchemaValues> | null = null;

function resolveLoadedValues(
	values: SchemaValues,
	hasExistingDocument: boolean
): SchemaValues {
	if (hasExistingDocument && Object.keys(values).length > 0) {
		return values;
	}

	return createSchemaInitialValues(globalsSchema, DEFAULT_LOCALE);
}

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

export function resetGlobalsStore(): void {
	globalsStore.values = {};
	globalsStore.loaded = false;
	globalsStore.hasExistingDocument = false;
	inflightLoad = null;
}

export async function ensureGlobalsLoaded(): Promise<SchemaValues> {
	if (globalsStore.loaded) return globalsStore.values;
	if (inflightLoad) return inflightLoad;

	inflightLoad = (async () => {
		const result = await loadGlobalsDocumentFromDb();
		if (result.errorMessage) throw new Error(result.errorMessage);

		const values = resolveLoadedValues(result.values, result.hasExistingDocument);
		setGlobalsValues(values, { hasExistingDocument: result.hasExistingDocument });
		return values;
	})();

	try {
		return await inflightLoad;
	} finally {
		inflightLoad = null;
	}
}
