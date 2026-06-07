import { globalsSchema } from "$/config/globals/globals.schema";
import { resolveSchemaValues } from "$lib/form-builder/core/translation-runtime";
import type { SchemaDefinition, SchemaValues } from "$lib/form-builder/core/types";

import type { GlobalsResolvedMap } from "./types";

export function resolveGlobalsValues(
	values: SchemaValues,
	locale: string,
	defaultLocale: string,
	schema: SchemaDefinition = globalsSchema
): GlobalsResolvedMap {
	return resolveSchemaValues(schema, values, locale, defaultLocale);
}
