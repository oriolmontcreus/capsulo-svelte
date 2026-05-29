<script lang="ts">
	import { splitHighlightSegments } from "./modules/highlight";

	interface Props {
		text: string;
		query?: string;
		highlight?: boolean;
	}

	let { text, query = "", highlight = false }: Props = $props();

	const segments = $derived(splitHighlightSegments(text, query, highlight));
</script>

{#each segments as segment, index (index)}
	{#if segment.highlighted}
		<mark class="bg-primary/20 rounded-sm px-0.5 font-medium">{segment.text}</mark>
	{:else}
		{segment.text}
	{/if}
{/each}
