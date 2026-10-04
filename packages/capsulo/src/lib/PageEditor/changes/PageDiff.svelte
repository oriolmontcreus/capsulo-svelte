<script lang="ts">
	import type { Snippet } from "svelte";
	import type { FieldChange, PageChangeSet } from "./diff-model";
	import InstanceDiff from "./InstanceDiff.svelte";
	import { t } from "$lib/admin-i18n/i18n.svelte";

	let {
		changeSet,
		emptyTitle = undefined,
		emptyDescription = undefined,
		fieldAction,
	}: {
		changeSet: PageChangeSet | null;
		emptyTitle?: string;
		emptyDescription?: string;
		/** Per-field Revert (Changes page) or Recover (History page) control. */
		fieldAction?: Snippet<[FieldChange]>;
	} = $props();
</script>

{#if !changeSet || changeSet.instances.length === 0}
	<div class="flex flex-col items-center justify-center py-16 text-center">
		<p class="text-foreground/80 text-lg font-normal">{emptyTitle ?? t("diff.noChangesTitle")}</p>
		<p class="text-muted-foreground mt-1 text-sm">{emptyDescription ?? t("diff.noChangesDescription")}</p>
	</div>
{:else}
	<div class="space-y-10">
		{#each changeSet.instances as instance (instance.instanceId)}
			<InstanceDiff {instance} {fieldAction} />
		{/each}
	</div>
{/if}
