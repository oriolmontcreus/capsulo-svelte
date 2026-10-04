<script lang="ts">
	import { onMount } from "svelte";
	import { globalsSchema } from "virtual:capsulo/globals-schema";
	import { Button } from "../components/ui/button";
	import * as Select from "../components/ui/select";
	import * as Tooltip from "../components/ui/tooltip";
	import { DEFAULT_LOCALE, LOCALES } from "../config/i18n-config";
	import type { SchemaValues } from "../form-builder/core/types";
	import SchemaRenderer from "../form-builder/renderer/SchemaRenderer.svelte";
	import type { FieldFocusRequest } from "../form-builder/renderer/schema-renderer-context";
	import GlobalVariablesProvider from "../globals/variable-autocomplete/GlobalVariablesProvider.svelte";
	import { buildVariableItems } from "../globals/variable-autocomplete/build-variable-items";
	import { formatVariablePreviewFromValues } from "../globals/variable-autocomplete/format-variable-preview";
	import { formatLocaleLabel } from "../utils/locale-label";
	import { GLOBALS_DRAFT_REPLACED_EVENT } from "../globals/globals-draft";

	import GlobalsEditorAlerts from "./GlobalsEditorAlerts.svelte";
	import { createGlobalsEditorDocument } from "./globals-editor-document.svelte";
	import { t } from "../admin-i18n/i18n.svelte";

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

	// "Fix this" links: /admin/globals?field=<name>&locale=<code>
	let focusRequest = $state<FieldFocusRequest | null>(null);

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const requestedLocale = params.get("locale");
		if (requestedLocale && LOCALES.includes(requestedLocale)) locale = requestedLocale;
		const field = params.get("field");
		if (field) {
			focusRequest = { path: field.split(".") };
			document.revealErrors();
		}

		document.initialize();
		const onDraftReplaced = () => void document.reloadDraft();
		window.addEventListener(GLOBALS_DRAFT_REPLACED_EVENT, onDraftReplaced);
		return () => window.removeEventListener(GLOBALS_DRAFT_REPLACED_EVENT, onDraftReplaced);
	});
</script>

<Tooltip.Provider delayDuration={150}>
	<GlobalVariablesProvider {getPreview} {getVariableItems}>
		<div class="relative flex flex-col gap-6 py-20">
			<div class="flex flex-col gap-2">
				<div class="flex items-start justify-between gap-4">
					<div class="flex flex-col gap-2">
						<h1 class="text-2xl font-normal tracking-tight">{t("globals.title")}</h1>
						<p class="text-foreground-muted text-sm">
							{t("globals.descriptionBefore")}
							<code class="text-foreground/80">{'{{variable}}'}</code>{t("globals.descriptionAfter")}
						</p>
					</div>

					<div class="flex shrink-0 items-center gap-2">
						{#if document.hasUnsavedChanges && !isSaving}
							<span class="text-muted-foreground text-xs">{t("globals.unsaved")}</span>
						{/if}
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
							{isSaving ? t("globals.saving") : t("globals.save")}
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
				validationIssues={document.validationIssues}
			/>

			{#if !document.isLoading}
				{#key document.schemaHydrationVersion}
					<SchemaRenderer
						schema={globalsSchema}
						locales={LOCALES}
						defaultLocale={DEFAULT_LOCALE}
						editingLocale={locale}
						translatableLocaleMode="active-only"
						showAllErrors={document.showAllErrors}
						{focusRequest}
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
