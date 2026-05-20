import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import { resolveSchemaValues } from "$lib/form-builder/core/translation-runtime";
import type { SchemaDefinition, SchemaValues } from "$lib/form-builder/core/types";

import { previewStore } from "./preview-store.svelte";

/**
 * Resolves CMS field values for a capsule instance in preview mode.
 * Use inside a Svelte capsule as: `const data = $derived(getCmsData<T>(instanceId, schema));`
 */
export function getCmsData<T extends Record<string, unknown>>(
	instanceId: string,
	schema: SchemaDefinition
): T | undefined {
	if (!previewStore.active) return undefined;

	const instanceValues = previewStore.valuesByInstance[instanceId] as SchemaValues | undefined;
	if (!instanceValues) return undefined;

	return resolveSchemaValues(
		schema,
		instanceValues,
		previewStore.locale,
		DEFAULT_LOCALE
	) as T;
}
