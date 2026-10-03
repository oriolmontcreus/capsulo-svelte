<script lang="ts">
	import { onMount } from "svelte";
	import { Button } from "$lib/components/ui/button";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { loadAllPageEditorCacheDocuments } from "$lib/PageEditor/page-editor-cache";
	import {
		toIssueListEntries,
		validatePageValues,
		type IssueListEntry,
	} from "$lib/PageEditor/validate-documents";
	import { listChangedPages, getPageChangeSet, type ChangedPageSummary } from "./changed-pages";
	import { commitChanges, type CommitFailure } from "./commit";
	import { applyFieldValueToDraft } from "./draft-write";
	import type { FieldChange, PageChangeSet } from "./diff-model";
	import ChangesSidebar from "./ChangesSidebar.svelte";
	import CommitForm from "./CommitForm.svelte";
	import PageDiff from "./PageDiff.svelte";
	import { t } from "$lib/admin-i18n/i18n.svelte";

	let changedPages = $state<ChangedPageSummary[]>([]);
	let selectedPageId = $state<string | null>(null);
	let isLoading = $state(true);

	let message = $state("");
	let isCommitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let failures = $state<CommitFailure[]>([]);
	let publishNotice = $state<string | null>(null);
	let revertError = $state<string | null>(null);
	/** Validation problems in the pages about to be committed; any one blocks the commit. */
	let issues = $state<IssueListEntry[]>([]);
	const issueCounts = $derived(
		issues.reduce<Record<string, number>>((counts, issue) => {
			counts[issue.pageId] = (counts[issue.pageId] ?? 0) + 1;
			return counts;
		}, {}),
	);

	/** Bumped after a revert so the diff re-reads the draft it just changed. */
	let draftRevision = $state(0);

	const changeSetPromise = $derived.by<Promise<PageChangeSet | null>>(() => {
		draftRevision;
		return selectedPageId ? getPageChangeSet(selectedPageId) : Promise.resolve(null);
	});

	/** Discards one pending field edit by writing the committed value back. */
	async function revertField(change: FieldChange): Promise<void> {
		if (!selectedPageId) return;

		revertError = null;
		const result = await applyFieldValueToDraft(
			selectedPageId,
			{
				instanceId: change.instanceId,
				fieldName: change.fieldName,
				locale: change.locale,
			},
			change.oldValue,
		);

		if (!result.ok) {
			revertError = result.errorMessage ?? t("changes.revertFailed");
			return;
		}

		draftRevision += 1;
		await refresh();
	}

	async function validateChangedPages(): Promise<void> {
		const changedIds = new Set(changedPages.map((page) => page.pageId));
		const documents = (await loadAllPageEditorCacheDocuments()).filter((document) =>
			changedIds.has(document.pageId),
		);
		issues = toIssueListEntries(
			documents.flatMap((document) => validatePageValues(document.pageId, document.valuesByInstance)),
			Object.fromEntries(documents.map((document) => [document.pageId, document.valuesByInstance])),
		);
	}

	async function refresh(): Promise<void> {
		changedPages = await listChangedPages();
		await validateChangedPages();
		if (!selectedPageId || !changedPages.some((page) => page.pageId === selectedPageId)) {
			selectedPageId = changedPages[0]?.pageId ?? null;
		}
		isLoading = false;
	}

	async function commit(): Promise<void> {
		if (isCommitting || issues.length > 0) return;
		isCommitting = true;
		errorMessage = null;
		failures = [];
		publishNotice = null;

		const result = await commitChanges(
			message,
			changedPages.map((page) => page.pageId),
		);

		errorMessage = result.errorMessage;
		failures = result.failures;
		publishNotice = result.publishNotice;
		if (!result.errorMessage && result.failures.length === 0) {
			message = "";
		}

		await refresh();
		isCommitting = false;
	}

	onMount(() => {
		void refresh();
	});
</script>

<div class="flex h-full min-h-0 w-full">
	<aside class="border-border flex w-72 shrink-0 flex-col border-r">
		<div class="border-border flex h-11 shrink-0 items-center border-b px-4">
			<h1 class="text-sm font-medium">{t("changes.title")}</h1>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto">
			<ChangesSidebar pages={changedPages} {issueCounts} bind:selectedPageId />
		</div>
		<CommitForm
			bind:message
			pageIds={changedPages.map((page) => page.pageId)}
			hasChanges={changedPages.length > 0}
			{isCommitting}
			{errorMessage}
			{failures}
			{publishNotice}
			{issues}
			oncommit={commit}
		/>
	</aside>

	<section class="min-w-0 flex-1">
		<ScrollArea class="h-full w-full">
			<div class="mx-auto max-w-3xl p-6">
				{#if isLoading}
					<p class="text-muted-foreground text-sm">{t("changes.loading")}</p>
				{:else if changedPages.length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-center">
						<p class="text-foreground/80 text-lg font-normal">{t("changes.nothingToCommit")}</p>
						<p class="text-muted-foreground mt-1 text-sm">
							{t("changes.upToDate")}
						</p>
					</div>
				{:else}
					<div aria-live="polite" class="empty:hidden">
						{#if revertError}
							<p class="text-destructive mb-4 text-xs">{revertError}</p>
						{/if}
					</div>
					{#await changeSetPromise then changeSet}
						<PageDiff {changeSet} fieldAction={revertAction} />
					{/await}
				{/if}
			</div>
		</ScrollArea>
	</section>
</div>

{#snippet revertAction(change: FieldChange)}
	<Button
		variant="ghost"
		size="xs"
		title={t("changes.revertTitle")}
		onclick={() => revertField(change)}
	>
		{t("changes.revert")}
	</Button>
{/snippet}
