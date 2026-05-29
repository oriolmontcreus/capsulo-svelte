<script lang="ts">
	import { onMount } from "svelte";
	import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
	import { type PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
	import { createCollapsedCapsulesState } from "./collapsed-capsules.svelte";
	import { createContentSidebarDocument } from "./content-sidebar-document.svelte";
	import { groupManifestEntries } from "./group-entries";
	import ContentSidebarAlerts from "./ContentSidebarAlerts.svelte";
	import ContentSidebarTopbar from "./ContentSidebarTopbar.svelte";
	import CapsuleGroupSection from "./CapsuleGroupSection.svelte";
	import type { ContentSidebarProps, PageEditorSaveControls } from "./types";

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

	const canCollapseAll = $derived(
		!document.isBlockingLoad && capsuleKeys.length > 0,
	);

	onMount(() => {
		document.initialize();
	});
</script>

<aside
	class="border-border bg-background flex min-h-0 shrink-0 flex-col overflow-hidden"
	aria-label="Page settings"
	style:width={width ? `${width}px` : undefined}
>
	<ContentSidebarTopbar
		disabled={!canCollapseAll}
		onCollapseAll={() => collapsedCapsules.collapseAll(capsuleKeys)}
	/>

	<div class="min-h-0 flex-1 overflow-y-auto">
		<div class="space-y-4 p-4">
			<ContentSidebarAlerts
				hasCheckedAuth={document.hasCheckedAuth}
				isAuthenticated={document.isAuthenticated}
				loadError={document.loadError}
				saveError={document.saveError}
				isBlockingLoad={document.isBlockingLoad}
				hasEntries={entries.length > 0}
			/>

			{#if !document.isBlockingLoad && entries.length > 0}
				{#each groupedEntries as group (group.capsuleKey)}
					<CapsuleGroupSection
						{group}
						isExpanded={collapsedCapsules.isExpanded(group.capsuleKey)}
						{locale}
						{valuesByInstance}
						schemaHydrationVersion={document.schemaHydrationVersion}
						onToggle={() => collapsedCapsules.toggle(group.capsuleKey)}
						onInstanceValuesChange={document.updateInstanceValues}
					/>
				{/each}
			{/if}
		</div>
	</div>
</aside>
