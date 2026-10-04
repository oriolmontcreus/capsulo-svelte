import { globalsSchema } from "$/config/globals/globals.schema";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import type { SchemaValues } from "$lib/form-builder/core/types";
import { resolveGlobalsValues } from "$lib/globals/resolve-globals";
import { formatGlobalDisplayValue } from "$lib/globals/types";

import type { VariableItem } from "./types";

export function buildVariableItems(
	values: SchemaValues,
	locale: string,
	defaultLocale: string = DEFAULT_LOCALE
): VariableItem[] {
	const resolved = resolveGlobalsValues(values, locale, defaultLocale);

	return globalsSchema.fields.map((field) => ({
		key: field.name,
		value: formatGlobalDisplayValue(resolved[field.name]),
		scope: "Global" as const
	}));
}
