<script lang="ts">
	import { onMount } from "svelte";
	import { globalsSchema } from "$/config/globals/globals.schema";
	import {
		Breadcrumb,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbList,
		BreadcrumbPage,
		BreadcrumbSeparator,
	} from "$lib/components/ui/breadcrumb";
	import { Button } from "$lib/components/ui/button";
	import * as Select from "$lib/components/ui/select";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
	import type { SchemaValues } from "$lib/form-builder/core/types";
	import SchemaRenderer from "$lib/form-builder/renderer/SchemaRenderer.svelte";
	import GlobalVariablesProvider from "$lib/globals/variable-autocomplete/GlobalVariablesProvider.svelte";
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

	onMount(() => {
		document.initialize();
	});
</script>

<Tooltip.Provider delayDuration={150}>
	<GlobalVariablesProvider {getPreview}>
		<div class="bg-background text-foreground flex min-h-dvh w-full flex-col">
			<nav
				class="border-border flex h-11 shrink-0 items-center justify-between border-b px-4"
			>
				<Breadcrumb>
					<BreadcrumbList class="text-xs">
						<BreadcrumbItem>
							<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator>/</BreadcrumbSeparator>
						<BreadcrumbItem>
							<BreadcrumbPage>Global Variables</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>

				<div class="flex items-center gap-2">
					<Select.Root type="single" bind:value={locale}>
						<Select.Trigger
							size="sm"
							class="text-muted-foreground hover:text-foreground h-7 min-w-0 gap-0.5 border-0 bg-transparent px-1 text-xs shadow-none hover:bg-transparent focus-visible:ring-1 dark:bg-transparent dark:hover:bg-transparent [&_svg]:size-3"
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
			</nav>

			<main class="mx-auto w-full max-w-3xl flex-1 p-6">
				<div class="space-y-4">
					<div>
						<h1 class="text-2xl font-semibold">Global Variables</h1>
						<p class="text-muted-foreground mt-1 text-sm">
							Site-wide settings used in capsule fields via
							<code class="text-foreground/80">{'{{variable}}'}</code> tokens.
						</p>
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
			</main>
		</div>
	</GlobalVariablesProvider>
</Tooltip.Provider>
