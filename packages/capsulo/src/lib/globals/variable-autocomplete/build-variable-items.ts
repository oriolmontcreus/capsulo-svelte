import { globalsSchema } from "virtual:capsulo/globals-schema";
import { DEFAULT_LOCALE } from "../../config/i18n-config";
import type { SchemaValues } from "../../form-builder/core/types";
import { resolveGlobalsValues } from "../resolve-globals";
import { formatGlobalDisplayValue } from "../types";

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
