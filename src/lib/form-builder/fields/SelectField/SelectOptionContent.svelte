<script lang="ts">
	import { cn } from "$lib/utils";
	import SelectOptionLabel from "./SelectOptionLabel.svelte";
	import type { SelectOption } from "./select-field.types";

	interface Props {
		option: SelectOption;
		query?: string;
		highlight?: boolean;
	}

	let { option, query = "", highlight = false }: Props = $props();

	const hasDescription = $derived(!!option.description?.trim());
</script>

<div class="flex min-w-0 flex-col gap-0.5">
	<span
		class={cn(
			"truncate text-sm leading-snug",
			hasDescription && "font-medium",
		)}
	>
		{#if highlight && query}
			<SelectOptionLabel text={option.label} {query} {highlight} />
		{:else}
			{option.label}
		{/if}
	</span>
	{#if hasDescription}
		<span class="text-muted-foreground truncate text-xs leading-snug">
			{#if highlight && query}
				<SelectOptionLabel text={option.description!} {query} {highlight} />
			{:else}
				{option.description}
			{/if}
		</span>
	{/if}
</div>
