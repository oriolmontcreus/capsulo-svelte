<script lang="ts">
	import * as Tooltip from "$lib/components/ui/tooltip";
	import MoreHorizontalIcon from "@lucide/svelte/icons/more-horizontal";

	type Props = {
		capsuleKey: string;
		instanceIds: string[];
	};

	let { capsuleKey, instanceIds }: Props = $props();

	const instanceCountLabel = $derived(
		`${instanceIds.length} instance${instanceIds.length === 1 ? "" : "s"}`,
	);
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<button
				type="button"
				{...props}
				class="text-muted-foreground hover:bg-transparent focus-visible:ring-ring inline-flex shrink-0 cursor-pointer items-center bg-transparent px-2 py-1.5 outline-none focus-visible:ring-2"
				aria-label={`Capsule info: key ${capsuleKey}, ${instanceCountLabel}`}
			>
				<MoreHorizontalIcon class="size-3.5" aria-hidden="true" />
			</button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content side="bottom" class="flex flex-col gap-2 py-2">
		<div class="flex flex-col gap-0.5">
			<span class="text-background/60">Key</span>
			<span class="font-mono">{capsuleKey}</span>
		</div>
		<div class="flex flex-col gap-0.5">
			<span class="text-background/60">Instances</span>
			<span>{instanceCountLabel}</span>
		</div>
		{#if instanceIds.length > 0}
			<ul class="flex flex-col gap-0.5 font-mono">
				{#each instanceIds as instanceId (instanceId)}
					<li>{instanceId}</li>
				{/each}
			</ul>
		{/if}
	</Tooltip.Content>
</Tooltip.Root>
