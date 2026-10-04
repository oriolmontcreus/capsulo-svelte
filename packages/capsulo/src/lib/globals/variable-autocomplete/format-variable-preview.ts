import { DEFAULT_LOCALE } from "../../config/i18n-config";
import type { SchemaValues } from "../../form-builder/core/types";
import { getGlobalsKnownKeys } from "../get-globals";
import { resolveGlobalsValues } from "../resolve-globals";
import { formatGlobalDisplayValue } from "../types";
import { t } from "../../admin-i18n/i18n.svelte";

const knownKeys = getGlobalsKnownKeys();

function formatVariablePreviewValue(
	key: string,
	value: unknown,
	keys: ReadonlySet<string> = knownKeys
): string {
	if (!keys.has(key)) return t("variables.unknown");

	const displayValue = formatGlobalDisplayValue(value);
	return displayValue || t("variables.empty");
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
