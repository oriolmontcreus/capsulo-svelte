<script lang="ts">
	import type { PageChangeSet } from "./diff-model";
	import InstanceDiff from "./InstanceDiff.svelte";

	let { changeSet }: { changeSet: PageChangeSet | null } = $props();
</script>

{#if !changeSet || changeSet.instances.length === 0}
	<div class="flex flex-col items-center justify-center py-16 text-center">
		<p class="text-foreground/80 text-lg font-normal">No changes to display</p>
		<p class="text-muted-foreground mt-1 text-sm">
			This page matches the last committed version
		</p>
	</div>
{:else}
	<div class="space-y-10">
		{#each changeSet.instances as instance (instance.instanceId)}
			<InstanceDiff {instance} />
		{/each}
	</div>
{/if}
