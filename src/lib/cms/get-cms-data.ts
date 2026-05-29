import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import {
	getSchemaDefaultValues,
	resolveSchemaValues
} from "$lib/form-builder/core/translation-runtime";
import type { SchemaDefinition, SchemaValues } from "$lib/form-builder/core/types";

import { cmsStore } from "./cms-store.svelte";

/**
 * Resolves CMS field values for a capsule instance.
 * Locale comes from the URL (via CmsPump) or from the Page Editor in preview mode.
 * Falls back to schema default values so capsules never render empty,
 * preventing layout shift that breaks Astro Dev Toolbar bounding boxes.
 * Use inside a Svelte capsule as: `const data = $derived(getCmsData<T>(instanceId, schema));`
 */
export function getCmsData<T extends Record<string, unknown>>(
	instanceId: string,
	schema: SchemaDefinition
): T {
	const locale = cmsStore.locale;
	const fallback = getSchemaDefaultValues(schema, locale, DEFAULT_LOCALE) as T;

	if (!cmsStore.active) return fallback;

	const instanceValues = cmsStore.valuesByInstance[instanceId] as SchemaValues | undefined;
	if (!instanceValues) return fallback;

	return resolveSchemaValues(schema, instanceValues, locale, DEFAULT_LOCALE) as T;
}
