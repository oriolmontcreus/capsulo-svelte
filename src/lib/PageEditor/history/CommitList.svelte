<script lang="ts">
	import { onMount } from "svelte";
	import { Button } from "$lib/components/ui/button";
	import {
		formatAbsoluteTimestamp,
		formatRelativeTimestamp
	} from "$lib/utils/format-timestamp";
	import { groupCommitsByDay, type CommitEntry } from "./history-model";
	import AuthorAvatar from "./AuthorAvatar.svelte";

	let {
		commits,
		selectedCommitId = null,
		hasMore = false,
		isLoadingMore = false,
		onselect,
		onloadmore
	}: {
		commits: CommitEntry[];
		selectedCommitId?: string | null;
		hasMore?: boolean;
		isLoadingMore?: boolean;
		onselect: (commitId: string) => void;
		onloadmore: () => void;
	} = $props();

	// Relative times are computed during render, so without a tick a list left
	// open would keep saying "just now" indefinitely (a legacy bug).
	let now = $state(Date.now());
	onMount(() => {
		const intervalId = window.setInterval(() => (now = Date.now()), 60_000);
		return () => window.clearInterval(intervalId);
	});

	const groups = $derived(groupCommitsByDay(commits, now));
</script>

{#if commits.length === 0}
	<p class="text-muted-foreground p-4 text-sm">No commits yet</p>
{:else}
	<div class="p-2">
		{#each groups as group (group.key)}
			<section aria-labelledby="day-{group.key}" class="mb-2">
				<h2
					id="day-{group.key}"
					class="text-muted-foreground px-3 py-1.5 text-[10px] font-medium tracking-wide uppercase"
				>
					{group.label}
				</h2>
				<ul>
					{#each group.commits as commit (commit.commitId)}
						{@const active = commit.commitId === selectedCommitId}
						<li>
							<button
								type="button"
								onclick={() => onselect(commit.commitId)}
								aria-current={active ? "true" : undefined}
								class="focus-visible:ring-ring flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none {active
									? 'bg-primary/20 text-foreground'
									: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
							>
								<span class="line-clamp-2 w-full text-sm">{commit.subject}</span>
								<span class="flex w-full items-center gap-1.5 text-[11px]">
									<AuthorAvatar name={commit.authorName} avatarUrl={commit.authorAvatarUrl} />
									<span class="truncate">{commit.authorName ?? "Unknown author"}</span>
									<span aria-hidden="true">·</span>
									<time
										datetime={commit.createdAt}
										title={formatAbsoluteTimestamp(commit.createdAt)}
										class="shrink-0"
									>
										{formatRelativeTimestamp(commit.createdAt, now)}
									</time>
									<span
										class="bg-muted text-muted-foreground ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums"
									>
										{commit.revisions.length}
										{commit.revisions.length === 1 ? "page" : "pages"}
									</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/each}

		{#if hasMore}
			<div class="p-2">
				<Button
					variant="outline"
					size="sm"
					class="w-full"
					disabled={isLoadingMore}
					onclick={() => onloadmore()}
				>
					{isLoadingMore ? "Loading..." : "Load more"}
				</Button>
			</div>
		{/if}
	</div>
{/if}
