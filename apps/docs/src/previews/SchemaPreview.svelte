<script lang="ts">
	import { BitsConfig } from 'bits-ui';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { SchemaDefinition } from '$lib/form-builder/core/types';
	import SchemaRenderer from '$lib/form-builder/renderer/SchemaRenderer.svelte';
	import { createSchemaInitialValues } from '$lib/form-builder/renderer/schema-renderer-i18n';
	import { globalsSchema } from '$/config/globals/globals.schema';
	import GlobalVariablesProvider from '$lib/globals/variable-autocomplete/GlobalVariablesProvider.svelte';
	import { buildVariableItems } from '$lib/globals/variable-autocomplete/build-variable-items';
	import { formatVariablePreviewFromValues } from '$lib/globals/variable-autocomplete/format-variable-preview';

	import './preview.css';

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

	// Popovers, selects and dialogs portal to the end of <body>, outside the preview.
	// Sending them to a container with the preview scope keeps the app's styles on them.
	function previewPortal(): HTMLElement | undefined {
		if (typeof document === 'undefined') return undefined;
		let portal = document.getElementById('capsulo-preview-portal');
		if (!portal) {
			portal = document.createElement('div');
			portal.id = 'capsulo-preview-portal';
			portal.className = 'capsulo-preview';
			document.body.append(portal);
		}
		return portal;
	}
	const portal = previewPortal();
</script>

<!-- Same wrapper as the old docs' SchemaRenderer, around the real one from the admin. -->
<div class="w-full mb-6">
	<h3 class="text-lg font-light mb-3">{schema.name}</h3>
	<div class="w-full text-card-foreground">
		<!-- `capsulo-preview` applies the app's own styles (preview.css) instead of the docs'. -->
		<div class="capsulo-preview not-prose p-4">
			<BitsConfig defaultPortalTo={portal}>
				<Tooltip.Provider delayDuration={150}>
					<GlobalVariablesProvider {getPreview} {getVariableItems}>
						<SchemaRenderer {schema} {locales} {defaultLocale} />
					</GlobalVariablesProvider>
				</Tooltip.Provider>
			</BitsConfig>
		</div>
	</div>
</div>
