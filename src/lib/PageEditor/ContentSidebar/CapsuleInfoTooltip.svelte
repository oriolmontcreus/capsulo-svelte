<script lang="ts">
	import * as Tooltip from "$lib/components/ui/tooltip";
	import KeyIcon from "@lucide/svelte/icons/key";
	import LayersIcon from "@lucide/svelte/icons/layers";
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

{#snippet infoLabel(Icon: typeof KeyIcon, label: string)}
	<div class="text-background/70 flex items-center gap-1.5">
		<Icon class="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
		<span class="text-[11px] font-medium tracking-wide">{label}</span>
	</div>
{/snippet}

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
	<Tooltip.Content
		side="bottom"
		class="flex min-w-48 flex-col items-stretch gap-3 px-3 py-2.5 text-left"
	>
		<div class="flex flex-col gap-1">
			{@render infoLabel(KeyIcon, "Key")}
			<div class="pl-5">
				<p class="font-mono text-xs leading-snug break-all">{capsuleKey}</p>
			</div>
		</div>

		<div class="flex flex-col gap-1">
			{@render infoLabel(LayersIcon, "Instances")}
			<div class="pl-5">
				{#if instanceIds.length > 0}
					<ul class="flex flex-col gap-1">
						{#each instanceIds as instanceId (instanceId)}
							<li class="font-mono text-xs leading-snug break-all">{instanceId}</li>
						{/each}
					</ul>
				{:else}
					<p class="text-background/60 text-xs">No instances</p>
				{/if}
			</div>
		</div>
	</Tooltip.Content>
</Tooltip.Root>
