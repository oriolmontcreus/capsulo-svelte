<script lang="ts">
	import { onMount } from "svelte";
	import { get } from "svelte/store";
	import { session, ensureSession } from "../../stores/session";
	import { Button } from "../../components/ui/button";
	import { ScrollArea } from "../../components/ui/scroll-area";
	import {
		loadMoreCommits,
		peekCommitList,
		revalidateCommitList,
		type CommitList as CommitListData
	} from "./history-documents";
	import type { CommitEntry } from "./history-model";
	import CommitDetail from "./CommitDetail.svelte";
	import CommitList from "./CommitList.svelte";
	import { t } from "../../admin-i18n/i18n.svelte";

	// The list from the last visit (or the background warm-up) renders at once; the
	// first page is revalidated in the background and new commits slide in on top.
	const cachedList = peekCommitList();
	let shownList: CommitListData | null = cachedList;

	let commits = $state<CommitEntry[]>(cachedList?.commits ?? []);
	let hasMore = $state(cachedList?.hasMore ?? false);
	let isLoading = $state(cachedList === null);
	let isLoadingMore = $state(false);
	let errorMessage = $state<string | null>(null);
	let isAuthenticated = $state(cachedList !== null);
	let hasCheckedAuth = $state(cachedList !== null);

	// Read from the URL up front, so a returning visit renders the selected commit at once.
	const initialParams = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
	let selectedCommitId = $state<string | null>(initialParams?.get("commit") ?? null);
	let selectedPageId = $state<string | null>(initialParams?.get("page") ?? null);

	const selectedCommit = $derived(
		commits.find((commit) => commit.commitId === selectedCommitId) ?? null
	);

	/** The page whose diff is shown: the one in the URL, else the commit's first (as CommitDetail does). */
	const shownPageId = $derived(
		selectedCommit?.revisions.find((revision) => revision.pageId === selectedPageId)?.pageId ??
			selectedCommit?.revisions[0]?.pageId ??
			""
	);

	/**
	 * Selection lives in the query string so a commit can be linked and survives a
	 * reload - the legacy page kept it in a store, which made every history view
	 * unshareable and lost on refresh.
	 *
	 * ponytail: replaceState rather than pushState, so this never competes with
	 * Astro's ClientRouter for popstate. Deep links and reloads work; Back leaves
	 * the page instead of stepping through selections.
	 */
	function readSelectionFromUrl(): void {
		const params = new URLSearchParams(window.location.search);
		selectedCommitId = params.get("commit");
		selectedPageId = params.get("page");
	}

	function writeSelectionToUrl(): void {
		const url = new URL(window.location.href);
		if (selectedCommitId) url.searchParams.set("commit", selectedCommitId);
		else url.searchParams.delete("commit");
		if (selectedPageId) url.searchParams.set("page", selectedPageId);
		else url.searchParams.delete("page");
		if (url.href === window.location.href) return;
		window.history.replaceState(window.history.state, "", url);
	}

	function selectCommit(commitId: string): void {
		if (commitId === selectedCommitId) return;
		selectedCommitId = commitId;
		selectedPageId = null;
		writeSelectionToUrl();
	}

	function selectPage(pageId: string): void {
		selectedPageId = pageId;
		writeSelectionToUrl();
	}

	function clearCommit(): void {
		selectedCommitId = null;
		selectedPageId = null;
		writeSelectionToUrl();
	}

	async function checkAuth(): Promise<void> {
		let userId = get(session)?.user?.id ?? null;
		if (!userId) {
			await ensureSession();
			userId = get(session)?.user?.id ?? null;
		}
		isAuthenticated = Boolean(userId);
		hasCheckedAuth = true;
	}

	function showList(list: CommitListData | null): void {
		if (!list || list === shownList) return;
		shownList = list;
		commits = list.commits;
		hasMore = list.hasMore;
	}

	/** Falls back to the newest commit only when the URL did not name one. */
	function selectNewestIfNone(): void {
		if (selectedCommitId) return;
		selectedCommitId = commits[0]?.commitId ?? null;
		writeSelectionToUrl();
	}

	async function loadFirstPage(): Promise<void> {
		isLoading = true;
		errorMessage = null;

		const result = await revalidateCommitList();
		errorMessage = result.errorMessage;
		showList(result.list);
		selectNewestIfNone();
		isLoading = false;
	}

	/** Brings a list already on screen up to date; a failure keeps showing it. */
	async function revalidateInBackground(): Promise<void> {
		const result = await revalidateCommitList();
		if (result.errorMessage) return;
		showList(result.list);
		selectNewestIfNone();
	}

	async function loadMore(): Promise<void> {
		if (isLoadingMore || !hasMore) return;
		isLoadingMore = true;

		const result = await loadMoreCommits();
		if (result.errorMessage) errorMessage = result.errorMessage;
		else showList(result.list);
		isLoadingMore = false;
	}

	async function retry(): Promise<void> {
		await checkAuth();
		if (isAuthenticated) await loadFirstPage();
	}

	onMount(() => {
		readSelectionFromUrl();
		if (cachedList) {
			selectNewestIfNone();
			void revalidateInBackground();
			return;
		}
		void (async () => {
			await checkAuth();
			if (isAuthenticated) {
				await loadFirstPage();
				return;
			}
			isLoading = false;
		})();
	});
</script>

<div class="flex h-full min-h-0 w-full">
	<!-- Below md the list and the detail swap instead of the list being hidden
	     outright, which made the legacy page unusable on a phone. -->
	<aside
		class="border-border w-full shrink-0 flex-col border-r md:flex md:w-72 {selectedCommit
			? 'hidden'
			: 'flex'}"
	>
		<div class="border-border flex h-11 shrink-0 items-center border-b px-4">
			<h1 class="text-sm font-medium">{t("history.title")}</h1>
		</div>
		<div class="min-h-0 flex-1">
			<ScrollArea class="h-full w-full" scrollKey="history:list">
				{#if isLoading}
					<p class="text-muted-foreground p-4 text-sm">{t("history.loading")}</p>
				{:else if hasCheckedAuth && !isAuthenticated}
					<p class="text-muted-foreground p-4 text-xs">
						{t("history.signInToView")}
						<a href="/admin/login" class="underline">{t("sidebar.goToLogin")}</a>
					</p>
				{:else if errorMessage}
					<div class="space-y-2 p-4">
						<p class="text-destructive text-xs">{errorMessage}</p>
						<Button variant="outline" size="sm" onclick={retry}>{t("history.tryAgain")}</Button>
					</div>
				{:else}
					<CommitList
						{commits}
						{selectedCommitId}
						{hasMore}
						{isLoadingMore}
						onselect={selectCommit}
						onloadmore={loadMore}
					/>
				{/if}
			</ScrollArea>
		</div>
	</aside>

	<section class="min-w-0 flex-1 {selectedCommit ? 'block' : 'hidden md:block'}">
		<ScrollArea class="h-full w-full" scrollKey={`history:${selectedCommitId ?? ""}:${shownPageId}`}>
			{#if selectedCommit}
				<div class="border-border flex h-11 items-center border-b px-4 md:hidden">
					<Button variant="ghost" size="sm" onclick={clearCommit}>{t("history.back")}</Button>
				</div>
				<CommitDetail
					commit={selectedCommit}
					{selectedPageId}
					onselectpage={selectPage}
				/>
			{:else if !isLoading && hasCheckedAuth && isAuthenticated && !errorMessage}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					{#if commits.length === 0}
						<p class="text-foreground/80 text-lg font-normal">{t("history.emptyTitle")}</p>
						<p class="text-muted-foreground mt-1 text-sm">
							{t("history.emptyBefore")}
							<a href="/admin/changes" class="underline">{t("history.emptyLink")}</a>
							{t("history.emptyAfter")}
						</p>
					{:else if selectedCommitId}
						<p class="text-foreground/80 text-lg font-normal">{t("history.notLoadedTitle")}</p>
						<p class="text-muted-foreground mt-1 text-sm">
							{t("history.notLoadedDescription")}
						</p>
					{:else}
						<p class="text-foreground/80 text-lg font-normal">{t("history.selectTitle")}</p>
						<p class="text-muted-foreground mt-1 text-sm">
							{t("history.selectDescription")}
						</p>
					{/if}
				</div>
			{/if}
		</ScrollArea>
	</section>
</div>
