import { globalsSchema } from "$/config/globals/globals.schema";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import { createSchemaInitialValues } from "$lib/form-builder/renderer/schema-renderer-i18n";
import type { SchemaValues } from "$lib/form-builder/core/types";

import { loadGlobalsDocumentFromDb } from "./globals-documents";
import { resolveGlobalsValues } from "./resolve-globals";
import type { GetGlobalsOptions, GlobalsResolvedMap } from "./types";

const CACHE_TTL_MS = 5000;

let cachedValues: SchemaValues | null = null;
let cacheTimestamp = 0;
let inflightLoad: Promise<SchemaValues> | null = null;

export function invalidateGlobalsCache(): void {
	cachedValues = null;
	cacheTimestamp = 0;
	inflightLoad = null;
}

async function loadGlobalsValuesFromDb(): Promise<SchemaValues> {
	const now = Date.now();
	if (cachedValues && now - cacheTimestamp < CACHE_TTL_MS) {
		return cachedValues;
	}

	if (inflightLoad) return inflightLoad;

	inflightLoad = (async () => {
		const result = await loadGlobalsDocumentFromDb();
		if (result.errorMessage) throw new Error(result.errorMessage);

		const values =
			result.hasExistingDocument && Object.keys(result.values).length > 0
				? result.values
				: createSchemaInitialValues(globalsSchema, DEFAULT_LOCALE);

		cachedValues = values;
		cacheTimestamp = Date.now();
		return values;
	})();

	try {
		return await inflightLoad;
	} finally {
		inflightLoad = null;
	}
}

export function getGlobalsKnownKeys(): ReadonlySet<string> {
	return new Set(globalsSchema.fields.map((field) => field.name));
}

export async function getGlobals(): Promise<GlobalsResolvedMap>;
export async function getGlobals(options: GetGlobalsOptions & { key: string }): Promise<unknown>;
export async function getGlobals(
	options?: GetGlobalsOptions
): Promise<GlobalsResolvedMap | unknown> {
	const locale = options?.locale ?? DEFAULT_LOCALE;
	const defaultLocale = DEFAULT_LOCALE;
	const rawValues = options?.values ?? (await loadGlobalsValuesFromDb());
	const resolved = resolveGlobalsValues(rawValues, locale, defaultLocale);

	if (options?.key) return resolved[options.key];

	return resolved;
}
