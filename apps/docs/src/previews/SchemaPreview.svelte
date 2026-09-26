<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { SchemaDefinition } from '$lib/form-builder/core/types';
	import SchemaRenderer from '$lib/form-builder/renderer/SchemaRenderer.svelte';
	import { createSchemaInitialValues } from '$lib/form-builder/renderer/schema-renderer-i18n';
	import { globalsSchema } from '$/config/globals/globals.schema';
	import GlobalVariablesProvider from '$lib/globals/variable-autocomplete/GlobalVariablesProvider.svelte';
	import { buildVariableItems } from '$lib/globals/variable-autocomplete/build-variable-items';
	import { formatVariablePreviewFromValues } from '$lib/globals/variable-autocomplete/format-variable-preview';

	interface Props {
		schema: SchemaDefinition;
		/** Locales the preview edits; more than one shows a translatable field once per locale. */
		locales?: string[];
	}

	let { schema, locales = ['en'] }: Props = $props();

	const defaultLocale = $derived(locales[0] ?? 'en');
	// Global variables at the defaults of the starter's globals schema ("My Awesome Site", ...).
	const globals = $derived(createSchemaInitialValues(globalsSchema, defaultLocale));
	const getPreview = (key: string) => formatVariablePreviewFromValues(key, globals, defaultLocale, defaultLocale);
	const getVariableItems = () => buildVariableItems(globals, defaultLocale, defaultLocale);
</script>

<!-- Same wrapper as the old docs' SchemaRenderer, around the real one from the admin. -->
<div class="w-full mb-6">
	<h3 class="text-lg font-light mb-3">{schema.name}</h3>
	<div class="w-full text-card-foreground">
		<div class="p-4">
			<Tooltip.Provider delayDuration={150}>
				<GlobalVariablesProvider {getPreview} {getVariableItems}>
					<SchemaRenderer {schema} {locales} {defaultLocale} />
				</GlobalVariablesProvider>
			</Tooltip.Provider>
		</div>
	</div>
</div>
