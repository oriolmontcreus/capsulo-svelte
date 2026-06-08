import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import type { SchemaValues } from "$lib/form-builder/core/types";
import { getGlobalsKnownKeys } from "$lib/globals/get-globals";
import { resolveGlobalsValues } from "$lib/globals/resolve-globals";
import { formatGlobalDisplayValue } from "$lib/globals/types";

const knownKeys = getGlobalsKnownKeys();

function formatVariablePreviewValue(
	key: string,
	value: unknown,
	keys: ReadonlySet<string> = knownKeys
): string {
	if (!keys.has(key)) return "Unknown variable";

	const displayValue = formatGlobalDisplayValue(value);
	return displayValue || "Empty";
}

export function formatVariablePreviewFromValues(
	key: string,
	values: SchemaValues,
	locale: string,
	defaultLocale: string = DEFAULT_LOCALE
): string {
	const resolved = resolveGlobalsValues(values, locale, defaultLocale);
	return formatVariablePreviewValue(key, resolved[key]);
}
