import { globalsSchema } from "$/config/globals/globals.schema";
import { resolveSchemaValues } from "$lib/form-builder/core/translation-runtime";
import type { SchemaDefinition, SchemaValues } from "$lib/form-builder/core/types";
import { createSchemaInitialValues } from "$lib/form-builder/renderer/schema-renderer-i18n";

import { type GlobalsResolvedMap, formatGlobalDisplayValue } from "./types";

/** Global variable values for one locale, as the text a `{{key}}` token is replaced with. */
export type GlobalVariableValues = Record<string, string>;

export function resolveGlobalsValues(
	values: SchemaValues,
	locale: string,
	defaultLocale: string,
	schema: SchemaDefinition = globalsSchema
): GlobalsResolvedMap {
	return resolveSchemaValues(schema, values, locale, defaultLocale);
}

/** Stored globals, or the schema defaults while nothing has been saved yet (as the admin shows them). */
export function withGlobalsDefaults(values: SchemaValues | null | undefined, defaultLocale: string): SchemaValues {
	if (values && Object.keys(values).length > 0) return values;
	return createSchemaInitialValues(globalsSchema, defaultLocale);
}

export function buildGlobalVariableValues(
	values: SchemaValues | null | undefined,
	locale: string,
	defaultLocale: string
): GlobalVariableValues {
	const resolved = resolveGlobalsValues(withGlobalsDefaults(values, defaultLocale), locale, defaultLocale);
	const variables: GlobalVariableValues = {};
	for (const field of globalsSchema.fields) {
		variables[field.name] = formatGlobalDisplayValue(resolved[field.name]);
	}
	return variables;
}
