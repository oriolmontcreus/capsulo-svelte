<script lang="ts">
	import { diffWords } from "diff";

	let { oldText = "", newText = "" }: { oldText?: string; newText?: string } = $props();

	const parts = $derived(diffWords(oldText, newText));
</script>

<span class="text-sm leading-relaxed whitespace-pre-wrap">
	{#each parts as part, index (index)}
		{#if part.added}
			<ins
				class="rounded-sm bg-green-500/15 px-0.5 text-green-700 no-underline dark:text-green-300"
				>{part.value}</ins
			>
		{:else if part.removed}
			<del
				class="rounded-sm bg-red-500/15 px-0.5 text-red-700 dark:text-red-300"
				>{part.value}</del
			>
		{:else}
			<span>{part.value}</span>
		{/if}
	{/each}
</span>
