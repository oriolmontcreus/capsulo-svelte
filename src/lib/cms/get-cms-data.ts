import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import {
	getSchemaDefaultValues,
	resolveSchemaValues
} from "$lib/form-builder/core/translation-runtime";
import type { SchemaDefinition, SchemaValues } from "$lib/form-builder/core/types";

import { previewStore } from "./preview-store.svelte";

/**
 * Resolves CMS field values for a capsule instance in preview mode.
 * Falls back to schema default values so capsules never render empty,
 * preventing layout shift that breaks Astro Dev Toolbar bounding boxes.
 * Use inside a Svelte capsule as: `const data = $derived(getCmsData<T>(instanceId, schema));`
 */
export function getCmsData<T extends Record<string, unknown>>(
	instanceId: string,
	schema: SchemaDefinition
): T {
	const fallback = getSchemaDefaultValues(schema, previewStore.locale, DEFAULT_LOCALE) as T;

	if (!previewStore.active) return fallback;

	const instanceValues = previewStore.valuesByInstance[instanceId] as SchemaValues | undefined;
	if (!instanceValues) return fallback;

	return resolveSchemaValues(
		schema,
		instanceValues,
		previewStore.locale,
		DEFAULT_LOCALE
	) as T;
}
