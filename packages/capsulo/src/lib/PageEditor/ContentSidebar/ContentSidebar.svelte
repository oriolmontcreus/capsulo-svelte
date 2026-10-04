<script lang="ts">
	import { onMount } from "svelte";
	import { DEFAULT_LOCALE } from "../../config/i18n-config";
	import { type PageEditorValuesByInstance } from "../persistence";
	import { createCollapsedCapsulesState } from "./collapsed-capsules.svelte";
	import { createContentSidebarDocument } from "./content-sidebar-document.svelte";
	import {
		DRAFT_REPLACED_EVENT,
		type DraftReplacedDetail,
	} from "../changes/draft-write";
	import { capsuleKeyFromInstanceId } from "../changes/schema-defaults";
	import { groupManifestEntries } from "./group-entries";
	import { ScrollArea } from "../../components/ui/scroll-area";
	import ContentSidebarAlerts from "./ContentSidebarAlerts.svelte";
	import ContentSidebarTopbar from "./ContentSidebarTopbar.svelte";
	import CapsuleGroupSection from "./CapsuleGroupSection.svelte";
	import type { ContentSidebarProps, PageEditorSaveControls } from "./types";
	import { t } from "../../admin-i18n/i18n.svelte";

	export type { PageEditorSaveControls };

	let {
		pageId,
		entries,
		locale = $bindable(DEFAULT_LOCALE),
		valuesByInstance = $bindable({} as PageEditorValuesByInstance),
		width,
		saveControls = $bindable({
			save: async () => {},
			disabled: true,
			isSaving: false,
		}),
		focusTarget = null,
		showAllErrors = $bindable(false),
	}: ContentSidebarProps = $props();

	const groupedEntries = $derived(groupManifestEntries(entries));
	const collapsedCapsules = createCollapsedCapsulesState();
	const capsuleKeys = $derived(groupedEntries.map((group) => group.capsuleKey));

	const document = createContentSidebarDocument({
		getPageId: () => pageId,
		getValuesByInstance: () => valuesByInstance,
		setValuesByInstance: (values) => {
			valuesByInstance = values;
		},
		getSaveControls: () => saveControls,
		setSaveControls: (controls) => {
			saveControls = controls;
		},
	});

	// A focused field's capsule must be open for the field to render.
	$effect(() => {
		if (!focusTarget) return;
		const capsuleKey = capsuleKeyFromInstanceId(focusTarget.instanceId);
		const group = groupedEntries.find((candidate) => candidate.capsuleKey === capsuleKey);
		if (group) collapsedCapsules.expand(group.capsuleKey);
	});

	const canCollapseAll = $derived(
		!document.isBlockingLoad && capsuleKeys.length > 0,
	);

	onMount(() => {
		document.initialize();
		const onDraftReplaced = (event: Event) => {
			const { pageId: replacedPageId } = (event as CustomEvent<DraftReplacedDetail>).detail;
			if (replacedPageId === pageId) void document.reloadDraftFromCache();
		};
		window.addEventListener(DRAFT_REPLACED_EVENT, onDraftReplaced);
		return () => window.removeEventListener(DRAFT_REPLACED_EVENT, onDraftReplaced);
	});
</script>

<aside
	class="border-border bg-background flex min-h-0 shrink-0 flex-col overflow-hidden"
	aria-label={t("sidebar.label")}
	style:width={width ? `${width}px` : undefined}
>
	<ContentSidebarTopbar
		disabled={!canCollapseAll}
		onCollapseAll={() => collapsedCapsules.collapseAll(capsuleKeys)}
	/>

	<div class="min-h-0 flex-1">
		<ScrollArea class="h-full w-full">
			<div class="space-y-4 p-4">
				<ContentSidebarAlerts
					hasCheckedAuth={document.hasCheckedAuth}
					isAuthenticated={document.isAuthenticated}
					loadError={document.loadError}
					saveError={document.saveError}
					isBlockingLoad={document.isBlockingLoad}
					hasEntries={entries.length > 0}
					remoteChangedWhileDirty={document.remoteChangedWhileDirty}
				/>

				{#if !document.isBlockingLoad && entries.length > 0}
					{#each groupedEntries as group (group.capsuleKey)}
						<CapsuleGroupSection
							{group}
							isExpanded={collapsedCapsules.isExpanded(group.capsuleKey)}
							{locale}
							{valuesByInstance}
							schemaHydrationVersion={document.schemaHydrationVersion}
							{focusTarget}
							{showAllErrors}
							onShowErrors={() => {
								showAllErrors = true;
								collapsedCapsules.expand(group.capsuleKey);
							}}
							onToggle={() => collapsedCapsules.toggle(group.capsuleKey)}
							onInstanceValuesChange={document.updateInstanceValues}
						/>
					{/each}
				{/if}
			</div>
		</ScrollArea>
	</div>
</aside>
