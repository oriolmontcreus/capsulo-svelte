<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Textarea } from "$lib/components/ui/textarea";
	import type { CommitFailure } from "./commit";

	const SUBJECT_SOFT_LIMIT = 72;

	let {
		message = $bindable(""),
		hasChanges,
		isCommitting,
		errorMessage = null,
		failures = [],
		publishNotice = null,
		oncommit,
	}: {
		message?: string;
		hasChanges: boolean;
		isCommitting: boolean;
		errorMessage?: string | null;
		failures?: CommitFailure[];
		publishNotice?: string | null;
		oncommit: () => void;
	} = $props();

	const trimmed = $derived(message.trim());
	const overLimit = $derived(message.length > SUBJECT_SOFT_LIMIT);
	const disabled = $derived(!hasChanges || trimmed.length === 0 || isCommitting);
</script>

<div class="border-border space-y-2 border-t p-3">
	<Textarea
		bind:value={message}
		rows={3}
		placeholder="Describe what changed..."
		disabled={!hasChanges || isCommitting}
		aria-label="Commit message"
	/>
	<div class="flex items-center justify-between text-[10px]">
		<span class={overLimit ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
			{message.length}/{SUBJECT_SOFT_LIMIT}
		</span>
	</div>

	{#if errorMessage}
		<p class="text-destructive text-xs">{errorMessage}</p>
	{/if}

	{#if publishNotice}
		<p class="text-muted-foreground text-xs" aria-live="polite">{publishNotice}</p>
	{/if}

	{#if failures.length > 0}
		<ul class="text-destructive space-y-0.5 text-xs">
			{#each failures as failure (failure.pageId)}
				<li><span class="font-medium">{failure.pageId}</span>: {failure.message}</li>
			{/each}
		</ul>
	{/if}

	<Button
		class="w-full text-white"
		size="sm"
		{disabled}
		onclick={() => oncommit()}
	>
		{isCommitting ? "Committing..." : "Commit changes"}
	</Button>
</div>
