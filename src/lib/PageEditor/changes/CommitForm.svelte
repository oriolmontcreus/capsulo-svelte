<script lang="ts">
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import AiNotice from "$lib/ai/components/AiNotice.svelte";
	import { AI_ENABLED } from "$lib/ai/config";
	import { AgentError } from "$lib/ai/stream-client";
	import { Button } from "$lib/components/ui/button";
	import * as Popover from "$lib/components/ui/popover";
	import { Textarea } from "$lib/components/ui/textarea";
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
	import type { IssueListEntry } from "$lib/PageEditor/validate-documents";
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
		issues = [],
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
		/** Validation problems that must be fixed first; the commit stays disabled meanwhile. */
		issues?: IssueListEntry[];
		oncommit: () => void;
	} = $props();

	let generation = $state<AbortController | null>(null);
	let generateError = $state<string | null>(null);
	/** Local dev only: the developer's Wrangler login is missing or expired. */
	let loginNoticeOpen = $state(false);
	let aiButton = $state<HTMLButtonElement | null>(null);

	const isGenerating = $derived(generation !== null);
	const trimmed = $derived(message.trim());
	const hasIssues = $derived(issues.length > 0);
	const disabled = $derived(
		!hasChanges || trimmed.length === 0 || isCommitting || isGenerating || hasIssues,
	);

	/**
	 * Fills the message from the pending changes, in the style of the author's recent
	 * commits and building on what they already typed. While it runs, the button
	 * ignores the pointer (so hovering can't disturb the spinner); Escape in the box or
	 * the button via keyboard stops it.
	 */
	async function generate(): Promise<void> {
		if (generation) {
			generation.abort();
			return;
		}

		const controller = new AbortController();
		generation = controller;
		generateError = null;
		loginNoticeOpen = false;
		const draft = message;
		try {
			const generated = await generateCommitMessage({
				pageIds,
				draft,
				signal: controller.signal,
				onText: (text) => (message = text.trimStart())
			});
			message = generated;
		} catch (error) {
			// Stopped or failed: a half-written suggestion is no use, so restore the draft.
			message = draft;
			if (!controller.signal.aborted) {
				console.error("[capsulo ai] commit message generation failed", error);
				if (error instanceof AgentError && error.code === "dev-login-required") {
					loginNoticeOpen = true;
				} else {
					generateError =
						error instanceof AgentError ? error.message : "Could not generate a commit message. Try again.";
				}
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
			onkeydown={(event) => {
				if (event.key === "Escape" && generation) {
					event.preventDefault();
					generation.abort();
				}
			}}
			aria-label="Commit message"
			class={AI_ENABLED ? "pr-9" : undefined}
		/>
		{#if AI_ENABLED}
			<Button
				variant="ghost"
				size="icon-xs"
				bind:ref={aiButton}
				class={[
					"text-muted-foreground hover:text-foreground absolute top-1.5 right-1.5",
					isGenerating && "pointer-events-none",
				]}
				title={isGenerating ? undefined : "Generate commit message with AI"}
				aria-label={isGenerating
					? "Generating commit message (Esc to stop)"
					: "Generate commit message with AI"}
				disabled={!hasChanges || isCommitting}
				onclick={generate}
			>
				{#if isGenerating}
					<LoaderCircleIcon class="animate-spin" aria-hidden="true" />
				{:else}
					<SparklesIcon aria-hidden="true" />
				{/if}
			</Button>

			<Popover.Root bind:open={loginNoticeOpen}>
				<Popover.Content customAnchor={aiButton} side="top" align="end" collisionPadding={8} class="w-72 gap-3">
					<Popover.Header>
						<Popover.Title>Cloudflare login needed</Popover.Title>
					</Popover.Header>
					<AiNotice text="" code="dev-login-required" />
					<Button
						variant="outline"
						size="xs"
						class="self-end"
						onclick={() => (loginNoticeOpen = false)}
					>
						Dismiss
					</Button>
				</Popover.Content>
			</Popover.Root>
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

	{#if hasIssues}
		<div
			class="border-destructive/30 bg-destructive/5 space-y-1.5 rounded-md border p-2"
			role="alert"
			aria-labelledby="commit-issues-title"
		>
			<p id="commit-issues-title" class="text-destructive flex items-center gap-1.5 text-xs font-medium">
				<CircleAlertIcon class="size-3.5 shrink-0" aria-hidden="true" />
				Fix {issues.length} {issues.length === 1 ? "issue" : "issues"} before committing
			</p>
			<ul class="max-h-48 space-y-1 overflow-y-auto">
				{#each issues as issue (issue.key)}
					<li>
						<a
							href={issue.href}
							class="hover:bg-destructive/10 block rounded px-1.5 py-1 text-xs leading-snug"
						>
							<span class="text-muted-foreground block truncate">
								{issue.pageName} › {issue.capsuleTitle} › {issue.location.join(" › ")}
								{#if issue.locale}
									<span class="bg-muted rounded px-1 text-[10px] uppercase">{issue.locale}</span>
								{/if}
							</span>
							<span class="text-foreground">{issue.message}</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
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
