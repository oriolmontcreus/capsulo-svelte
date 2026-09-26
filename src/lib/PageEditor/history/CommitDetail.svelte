<script lang="ts">
	import { pageDisplayName } from "$lib/PageEditor/changes/changed-pages";
	import {
		computePageChangeSet,
		type FieldChange,
		type PageChangeSet
	} from "$lib/PageEditor/changes/diff-model";
	import {
		applyFieldValueToDraft,
		restoreRevisionToDraft
	} from "$lib/PageEditor/changes/draft-write";
	import PageDiff from "$lib/PageEditor/changes/PageDiff.svelte";
	import { resolveInstanceDefaults } from "$lib/PageEditor/changes/schema-defaults";
	import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
	import { Button } from "$lib/components/ui/button";
	import { formatAbsoluteTimestamp } from "$lib/utils/format-timestamp";
	import { loadRevisionWithParent } from "./history-documents";
	import type { CommitEntry, CommitRevision } from "./history-model";
	import AuthorAvatar from "./AuthorAvatar.svelte";

	let {
		commit,
		selectedPageId = null,
		onselectpage
	}: {
		commit: CommitEntry;
		selectedPageId?: string | null;
		onselectpage: (pageId: string) => void;
	} = $props();

	const selectedRevision = $derived(
		commit.revisions.find((revision) => revision.pageId === selectedPageId) ??
			commit.revisions[0] ??
			null
	);

	type RevisionView = {
		changeSet: PageChangeSet | null;
		revisionValues: PageEditorValuesByInstance;
		isFirstRevision: boolean;
		errorMessage: string | null;
	};

	async function loadRevisionView(
		revision: CommitRevision | null
	): Promise<RevisionView | null> {
		if (!revision) return null;

		const result = await loadRevisionWithParent(revision.pageId, revision.revisionId);
		if (result.errorMessage) {
			return {
				changeSet: null,
				revisionValues: {},
				isFirstRevision: false,
				errorMessage: result.errorMessage
			};
		}

		return {
			// Diffed against the revision immediately before it, so the page shows
			// what this commit actually changed.
			changeSet: computePageChangeSet(
				revision.pageId,
				result.parentValues,
				result.revisionValues,
				resolveInstanceDefaults
			),
			revisionValues: result.revisionValues,
			isFirstRevision: result.isFirstRevision,
			errorMessage: null
		};
	}

	const revisionViewPromise = $derived(loadRevisionView(selectedRevision));

	let status = $state<{ tone: "ok" | "error"; text: string } | null>(null);
	let isRestoring = $state(false);

	// Drop the last Recover/Restore result when the viewed revision changes, so a
	// message about one page never lingers above a different one.
	$effect(() => {
		selectedRevision;
		status = null;
	});

	/**
	 * Everything on this page restores "as of this revision", so a field recovers
	 * its value at this commit (the new side of the diff), matching what the
	 * page-level Restore button does.
	 */
	async function recoverField(change: FieldChange): Promise<void> {
		const revision = selectedRevision;
		if (!revision) return;

		status = null;
		const result = await applyFieldValueToDraft(
			revision.pageId,
			{
				instanceId: change.instanceId,
				fieldName: change.fieldName,
				locale: change.locale
			},
			change.newValue
		);

		status = result.ok
			? { tone: "ok", text: `Recovered ${change.fieldName} into the ${pageDisplayName(revision.pageId)} draft.` }
			: { tone: "error", text: result.errorMessage ?? "Could not recover that value." };
	}

	async function restorePage(values: PageEditorValuesByInstance): Promise<void> {
		const revision = selectedRevision;
		if (!revision || isRestoring) return;

		isRestoring = true;
		status = null;
		const result = await restoreRevisionToDraft(revision.pageId, values);
		isRestoring = false;

		status = result.ok
			? {
					tone: "ok",
					text: `Restored ${pageDisplayName(revision.pageId)} to this revision. Review it on the Changes page.`
				}
			: { tone: "error", text: result.errorMessage ?? "Could not restore that revision." };
	}
</script>

<div class="mx-auto max-w-3xl p-6">
	<header class="border-border space-y-3 border-b pb-5">
		<h2 class="text-xl font-medium tracking-tight">{commit.subject}</h2>
		{#if commit.body}
			<p class="text-muted-foreground text-sm whitespace-pre-wrap">{commit.body}</p>
		{/if}
		<p class="text-muted-foreground flex items-center gap-1.5 text-xs">
			<AuthorAvatar name={commit.authorName} avatarUrl={commit.authorAvatarUrl} size="md" />
			<span>{commit.authorName ?? "Unknown author"}</span>
			<span aria-hidden="true">·</span>
			<time datetime={commit.createdAt}>{formatAbsoluteTimestamp(commit.createdAt)}</time>
		</p>
	</header>

	<nav aria-label="Pages in this commit" class="border-border border-b py-3">
		<h3 class="text-muted-foreground mb-2 text-[10px] font-medium tracking-wide uppercase">
			Changed pages ({commit.revisions.length})
		</h3>
		<ul class="flex flex-wrap gap-1.5">
			{#each commit.revisions as revision (revision.revisionId)}
				{@const active = revision.pageId === selectedRevision?.pageId}
				<li>
					<button
						type="button"
						onclick={() => onselectpage(revision.pageId)}
						aria-current={active ? "true" : undefined}
						class="focus-visible:ring-ring cursor-pointer rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none {active
							? 'bg-primary/20 text-foreground'
							: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
					>
						{pageDisplayName(revision.pageId)}
					</button>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Recover/Restore results are announced rather than only flashed, which the
	     legacy 2s tick/cross never was. -->
	<div aria-live="polite" class="empty:hidden">
		{#if status}
			<p
				class="mt-4 rounded-md border border-dashed p-3 text-xs {status.tone === 'error'
					? 'text-destructive'
					: 'text-muted-foreground'}"
			>
				{status.text}
				{#if status.tone === "ok"}
					<a href="/admin/changes" class="underline">Go to Changes</a>.
				{/if}
			</p>
		{/if}
	</div>

	{#await revisionViewPromise}
		<p class="text-muted-foreground py-8 text-sm">Loading changes...</p>
	{:then view}
		{#if !view}
			<p class="text-muted-foreground py-8 text-sm">This commit has no pages to show.</p>
		{:else if view.errorMessage}
			<p class="text-destructive py-8 text-sm">{view.errorMessage}</p>
		{:else}
			<div class="flex items-center justify-between gap-4 py-4">
				<p class="text-muted-foreground text-xs">
					{#if view.isFirstRevision}
						This commit created the page.
					{:else}
						Compared with the previous revision of this page.
					{/if}
				</p>
				<Button
					variant="outline"
					size="sm"
					disabled={isRestoring}
					onclick={() => restorePage(view.revisionValues)}
				>
					{isRestoring ? "Restoring..." : "Restore this page to this revision"}
				</Button>
			</div>

			<PageDiff
				changeSet={view.changeSet}
				emptyTitle="No content changes in this revision"
				emptyDescription="This page was written without any field changing."
				fieldAction={recoverAction}
			/>
		{/if}
	{/await}
</div>

{#snippet recoverAction(change: FieldChange)}
	<Button
		variant="ghost"
		size="xs"
		title="Copy this value into the working draft"
		onclick={() => recoverField(change)}
	>
		Recover
	</Button>
{/snippet}
