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
	import { GLOBALS_DOCUMENT_ID } from "../globals/globals-persistence";
	import { DRAFT_REPLACED_EVENT, type DraftReplacedDetail } from "../PageEditor/changes/draft-write";

	import GlobalsEditorAlerts from "./GlobalsEditorAlerts.svelte";
	import { createGlobalsEditorDocument } from "./globals-editor-document.svelte";
	import { t } from "../admin-i18n/i18n.svelte";

	let locale = $state(DEFAULT_LOCALE);
	let values = $state<SchemaValues>({});

	const document = createGlobalsEditorDocument({
		getValues: () => values,
		setValues: (nextValues) => {
			values = nextValues;
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
		const onDraftReplaced = (event: Event) => {
			const { pageId } = (event as CustomEvent<DraftReplacedDetail>).detail;
			if (pageId === GLOBALS_DOCUMENT_ID) void document.reloadDraft();
		};
		window.addEventListener(DRAFT_REPLACED_EVENT, onDraftReplaced);
		return () => window.removeEventListener(DRAFT_REPLACED_EVENT, onDraftReplaced);
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
							href="/admin/changes"
							class="border-card h-7 rounded-full border px-3 text-white"
						>
							{t("pageEditor.reviewChanges")}
						</Button>
					</div>
				</div>
			</div>

			<GlobalsEditorAlerts
				hasCheckedAuth={document.hasCheckedAuth}
				isAuthenticated={document.isAuthenticated}
				loadError={document.loadError}
				isLoading={document.isLoading}
				remoteChangedWhileDirty={document.remoteChangedWhileDirty}
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
