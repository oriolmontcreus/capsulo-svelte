import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import {
	getSchemaDefaultValues,
	resolveSchemaValues
} from "$lib/form-builder/core/translation-runtime";
import type { SchemaDefinition, SchemaValues } from "$lib/form-builder/core/types";
import { buildGlobalVariableValues } from "$lib/globals/resolve-globals";
import { substituteSchemaVariables } from "$lib/globals/substitute-variables";

import { cmsStore } from "./cms-store.svelte";
import { getPublishedValues, getPublishedVariables } from "./published";

/**
 * Resolves CMS field values for a capsule instance, in this order: the editor draft
 * (preview mode), the published content baked into the page, then schema defaults.
 * Locale comes from the URL (via CmsPump) or from the Page Editor in preview mode.
 * Falling back to schema default values means capsules never render empty,
 * preventing layout shift that breaks Astro Dev Toolbar bounding boxes.
 * `{{key}}` tokens in text, textarea and rich editor fields are replaced with the global
 * variables for the locale: the published globals, or the editor's globals in preview mode.
 * Use inside a Svelte capsule as: `const data = $derived(getCmsData<T>(instanceId, schema));`
 */
export function getCmsData<T extends Record<string, unknown>>(
	instanceId: string,
	schema: SchemaDefinition
): T {
	const locale = cmsStore.locale;
	const variables =
		cmsStore.active && cmsStore.globals
			? buildGlobalVariableValues(cmsStore.globals, locale, DEFAULT_LOCALE)
			: getPublishedVariables();

	const instanceValues = (
		cmsStore.active ? cmsStore.valuesByInstance[instanceId] : getPublishedValues()[instanceId]
	) as SchemaValues | undefined;
	const resolved = instanceValues
		? resolveSchemaValues(schema, instanceValues, locale, DEFAULT_LOCALE)
		: getSchemaDefaultValues(schema, locale, DEFAULT_LOCALE);

	return substituteSchemaVariables(schema, resolved, variables) as T;
}
