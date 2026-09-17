<script lang="ts">
	import type { Snippet } from "svelte";
	import type { FieldChange, PageChangeSet } from "./diff-model";
	import InstanceDiff from "./InstanceDiff.svelte";

	let {
		changeSet,
		emptyTitle = "No changes to display",
		emptyDescription = "This page matches the last committed version",
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
		<p class="text-foreground/80 text-lg font-normal">{emptyTitle}</p>
		<p class="text-muted-foreground mt-1 text-sm">{emptyDescription}</p>
	</div>
{:else}
	<div class="space-y-10">
		{#each changeSet.instances as instance (instance.instanceId)}
			<InstanceDiff {instance} {fieldAction} />
		{/each}
	</div>
{/if}
