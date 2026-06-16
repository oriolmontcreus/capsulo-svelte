<script lang="ts">
	import { onMount } from "svelte";
	import { globalsSchema } from "$/config/globals/globals.schema";
	import { Button } from "$lib/components/ui/button";
	import * as Select from "$lib/components/ui/select";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
	import type { SchemaValues } from "$lib/form-builder/core/types";
	import SchemaRenderer from "$lib/form-builder/renderer/SchemaRenderer.svelte";
	import GlobalVariablesProvider from "$lib/globals/variable-autocomplete/GlobalVariablesProvider.svelte";
	import { buildVariableItems } from "$lib/globals/variable-autocomplete/build-variable-items";
	import { formatVariablePreviewFromValues } from "$lib/globals/variable-autocomplete/format-variable-preview";
	import { formatLocaleLabel } from "$lib/utils/locale-label";

	import GlobalsEditorAlerts from "./GlobalsEditorAlerts.svelte";
	import { createGlobalsEditorDocument } from "./globals-editor-document.svelte";

	let locale = $state(DEFAULT_LOCALE);
	let values = $state<SchemaValues>({});
	let isSaving = $state(false);
	let saveDisabled = $state(true);

	const document = createGlobalsEditorDocument({
		getValues: () => values,
		setValues: (nextValues) => {
			values = nextValues;
		},
		getSaveDisabled: () => saveDisabled,
		setSaveDisabled: (disabled) => {
			saveDisabled = disabled;
		},
		getIsSaving: () => isSaving,
		setIsSaving: (nextIsSaving) => {
			isSaving = nextIsSaving;
		},
	});

	function getPreview(key: string): string {
		return formatVariablePreviewFromValues(key, values, locale);
	}

	function getVariableItems() {
		return buildVariableItems(values, locale);
	}

	onMount(() => {
		document.initialize();
	});
</script>

<Tooltip.Provider delayDuration={150}>
	<GlobalVariablesProvider {getPreview} {getVariableItems}>
		<div class="relative flex flex-col gap-6 py-20">
			<div class="flex flex-col gap-2">
				<div class="flex items-start justify-between gap-4">
					<div class="flex flex-col gap-2">
						<h1 class="text-2xl font-normal tracking-tight">Global Variables</h1>
						<p class="text-foreground-muted text-sm">
							Site-wide settings used in capsule fields via
							<code class="text-foreground/80">{'{{variable}}'}</code> tokens.
						</p>
					</div>

					<div class="flex shrink-0 items-center gap-2">
						<Select.Root type="single" bind:value={locale}>
							<Select.Trigger
								size="sm"
								class="text-foreground-muted hover:text-foreground h-7 min-w-0 gap-0.5 border-0 bg-transparent px-1 text-xs shadow-none hover:bg-transparent focus-visible:ring-1 dark:bg-transparent dark:hover:bg-transparent [&_svg]:size-3"
							>
								{formatLocaleLabel(locale)}
							</Select.Trigger>
							<Select.Content>
								{#each LOCALES as localeOption (localeOption)}
									<Select.Item value={localeOption}>
										{formatLocaleLabel(localeOption)}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>

						<Button
							size="sm"
							class="border-card h-7 rounded-full border px-3 text-white"
							onclick={() => document.saveGlobalsDocument()}
							disabled={saveDisabled}
						>
							{isSaving ? "Saving..." : "Save"}
						</Button>
					</div>
				</div>
			</div>

			<GlobalsEditorAlerts
				hasCheckedAuth={document.hasCheckedAuth}
				isAuthenticated={document.isAuthenticated}
				loadError={document.loadError}
				saveError={document.saveError}
				isLoading={document.isLoading}
			/>

			{#if !document.isLoading}
				{#key document.schemaHydrationVersion}
					<SchemaRenderer
						schema={globalsSchema}
						locales={LOCALES}
						defaultLocale={DEFAULT_LOCALE}
						editingLocale={locale}
						translatableLocaleMode="active-only"
						initialValues={values}
						onValuesChange={(nextValues) => {
							values = nextValues;
						}}
					/>
				{/key}
			{/if}
		</div>
	</GlobalVariablesProvider>
</Tooltip.Provider>
