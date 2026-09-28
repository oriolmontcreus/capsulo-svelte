<script lang="ts">
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import { AI_ENABLED } from "$lib/ai/config";
	import { AgentError } from "$lib/ai/stream-client";
	import { Button } from "$lib/components/ui/button";
	import { Textarea } from "$lib/components/ui/textarea";
	import type { CommitFailure } from "./commit";
	import { generateCommitMessage } from "./commit-message-ai";

	let {
		message = $bindable(""),
		pageIds,
		hasChanges,
		isCommitting,
		errorMessage = null,
		failures = [],
		publishNotice = null,
		oncommit,
	}: {
		message?: string;
		/** The pages being committed: what the AI describes. */
		pageIds: string[];
		hasChanges: boolean;
		isCommitting: boolean;
		errorMessage?: string | null;
		failures?: CommitFailure[];
		publishNotice?: string | null;
		oncommit: () => void;
	} = $props();

	let generation = $state<AbortController | null>(null);
	let generateError = $state<string | null>(null);

	const isGenerating = $derived(generation !== null);
	const trimmed = $derived(message.trim());
	const disabled = $derived(!hasChanges || trimmed.length === 0 || isCommitting || isGenerating);

	/**
	 * Fills the message from the pending changes, in the style of the author's recent
	 * commits and building on what they already typed. Clicking again stops it.
	 */
	async function generate(): Promise<void> {
		if (generation) {
			generation.abort();
			return;
		}

		const controller = new AbortController();
		generation = controller;
		generateError = null;
		const draft = message;
		try {
			const generated = await generateCommitMessage({
				pageIds,
				draft,
				signal: controller.signal,
				onText: (text) => (message = text.trimStart())
			});
			// An empty reply keeps what the author wrote rather than wiping it.
			message = generated || draft;
		} catch (error) {
			// Stopped or failed: a half-written suggestion is no use, so restore the draft.
			message = draft;
			if (!controller.signal.aborted) {
				generateError =
					error instanceof AgentError ? error.message : "Could not generate a commit message. Try again.";
			}
		} finally {
			generation = null;
		}
	}
</script>

<div class="border-border space-y-2 border-t p-3">
	<div class="relative">
		<Textarea
			bind:value={message}
			rows={3}
			placeholder="Describe what changed..."
			disabled={!hasChanges || isCommitting}
			readonly={isGenerating}
			aria-busy={isGenerating}
			aria-label="Commit message"
			class={AI_ENABLED ? "pr-9" : undefined}
		/>
		{#if AI_ENABLED}
			<Button
				variant="ghost"
				size="icon-xs"
				class="text-muted-foreground hover:text-foreground absolute top-1.5 right-1.5"
				title={isGenerating ? "Stop generating" : "Generate commit message with AI"}
				aria-label={isGenerating ? "Stop generating" : "Generate commit message with AI"}
				disabled={!hasChanges || isCommitting}
				onclick={generate}
			>
				{#if isGenerating}
					<LoaderCircleIcon class="animate-spin" aria-hidden="true" />
				{:else}
					<SparklesIcon aria-hidden="true" />
				{/if}
			</Button>
		{/if}
	</div>

	{#if generateError}
		<p class="text-destructive text-xs" aria-live="polite">{generateError}</p>
	{/if}

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
