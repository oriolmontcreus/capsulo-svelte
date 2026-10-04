<script lang="ts">
	import { onMount } from "svelte";
	import { Button } from "../../components/ui/button";
	import { ScrollArea } from "../../components/ui/scroll-area";
	import {
		loadAllPageEditorCacheDocuments,
		onChangesUpdated,
		peekAllPageEditorDocuments,
	} from "../page-editor-cache";
	import type { PageEditorCachedDocument } from "../persistence";
	import {
		toIssueListEntries,
		validatePageValues,
		type IssueListEntry,
	} from "../validate-documents";
	import { getPageChangeSet, summarizeChangedPages, type ChangedPageSummary } from "./changed-pages";
	import { commitChanges, type CommitFailure } from "./commit";
	import { applyFieldValueToDraft } from "./draft-write";
	import type { FieldChange, PageChangeSet } from "./diff-model";
	import ChangesSidebar from "./ChangesSidebar.svelte";
	import CommitForm from "./CommitForm.svelte";
	import PageDiff from "./PageDiff.svelte";
	import { t } from "../../admin-i18n/i18n.svelte";
	import { rememberScroll } from "../../admin/scroll-memory";

	/** Validation problems in `pages`, read from their drafts in `documents`. */
	function findIssues(
		pages: ChangedPageSummary[],
		documents: PageEditorCachedDocument[],
	): IssueListEntry[] {
		const changedIds = new Set(pages.map((page) => page.pageId));
		const changedDocuments = documents.filter((document) => changedIds.has(document.pageId));
		return toIssueListEntries(
			changedDocuments.flatMap((document) => validatePageValues(document.pageId, document.valuesByInstance)),
			Object.fromEntries(changedDocuments.map((document) => [document.pageId, document.valuesByInstance])),
		);
	}

	// Drafts this session already read render at once; refresh() then re-reads IndexedDB,
	// which other tabs may have written to.
	const cachedDocuments = peekAllPageEditorDocuments();
	const cachedPages = cachedDocuments ? summarizeChangedPages(cachedDocuments) : [];

	/** The page named in the URL (?page=), so a reload or coming back keeps the selection. */
	const requestedPageId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("page");

	/** The requested page while it still has changes, otherwise the first one. */
	function pickSelection(pages: ChangedPageSummary[], preferred: string | null): string | null {
		return pages.some((page) => page.pageId === preferred) ? preferred : (pages[0]?.pageId ?? null);
	}

	let changedPages = $state<ChangedPageSummary[]>(cachedPages);
	let selectedPageId = $state<string | null>(pickSelection(cachedPages, requestedPageId));
	let isLoading = $state(cachedDocuments === null);

	let message = $state("");
	let isCommitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let failures = $state<CommitFailure[]>([]);
	let publishNotice = $state<string | null>(null);
	let revertError = $state<string | null>(null);
	/** Validation problems in the pages about to be committed; any one blocks the commit. */
	let issues = $state<IssueListEntry[]>(cachedDocuments ? findIssues(cachedPages, cachedDocuments) : []);
	const issueCounts = $derived(
		issues.reduce<Record<string, number>>((counts, issue) => {
			counts[issue.pageId] = (counts[issue.pageId] ?? 0) + 1;
			return counts;
		}, {}),
	);

	/** Bumped after every refresh so the diff re-reads the drafts. */
	let draftRevision = $state(0);

	// A plain value when the drafts are already in memory, so `{#await}` shows it straight away.
	const selectedChangeSet = $derived.by<PageChangeSet | null | Promise<PageChangeSet | null>>(() => {
		draftRevision;
		return selectedPageId ? getPageChangeSet(selectedPageId) : null;
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

		if (!result.ok) revertError = result.errorMessage ?? t("changes.revertFailed");
		// On success the draft write fires the changes event, which refreshes this page.
	}

	let latestRefreshRunId = 0;

	async function refresh(): Promise<void> {
		// Writes can land back to back (a commit saves every page): only the newest read counts.
		const runId = ++latestRefreshRunId;
		const documents = await loadAllPageEditorCacheDocuments();
		if (runId !== latestRefreshRunId) return;

		const pages = summarizeChangedPages(documents);
		changedPages = pages;
		issues = findIssues(pages, documents);
		draftRevision += 1;
		// Until the first read, the URL's page may simply not be in the in-memory drafts yet.
		selectedPageId = pickSelection(pages, isLoading ? (requestedPageId ?? selectedPageId) : selectedPageId);
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

	$effect(() => {
		const url = new URL(window.location.href);
		if (selectedPageId) url.searchParams.set("page", selectedPageId);
		else url.searchParams.delete("page");
		// replaceState rather than pushState: it never competes with the client router for popstate.
		if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
	});

	onMount(() => {
		void refresh();
		// Drafts also change from outside this page: the AI agent, or another admin tab.
		return onChangesUpdated(() => void refresh());
	});
</script>

<div class="flex h-full min-h-0 w-full">
	<aside class="border-border flex w-72 shrink-0 flex-col border-r">
		<div class="border-border flex h-11 shrink-0 items-center border-b px-4">
			<h1 class="text-sm font-medium">{t("changes.title")}</h1>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto" {@attach rememberScroll("changes:list")}>
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
		<ScrollArea class="h-full w-full" scrollKey={`changes:${selectedPageId ?? ""}`}>
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
					{#await selectedChangeSet then changeSet}
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
