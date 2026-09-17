<script lang="ts">
	import { onMount } from "svelte";
	import { get } from "svelte/store";
	import { session, syncSession } from "$lib/stores/session";
	import { Button } from "$lib/components/ui/button";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { loadCommitPage } from "./history-documents";
	import type { CommitEntry } from "./history-model";
	import CommitDetail from "./CommitDetail.svelte";
	import CommitList from "./CommitList.svelte";

	let commits = $state<CommitEntry[]>([]);
	let cursor = $state<string | null>(null);
	let hasMore = $state(false);
	let isLoading = $state(true);
	let isLoadingMore = $state(false);
	let errorMessage = $state<string | null>(null);
	let isAuthenticated = $state(false);
	let hasCheckedAuth = $state(false);

	let selectedCommitId = $state<string | null>(null);
	let selectedPageId = $state<string | null>(null);

	const selectedCommit = $derived(
		commits.find((commit) => commit.commitId === selectedCommitId) ?? null
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
			await syncSession();
			userId = get(session)?.user?.id ?? null;
		}
		isAuthenticated = Boolean(userId);
		hasCheckedAuth = true;
	}

	async function loadFirstPage(): Promise<void> {
		isLoading = true;
		errorMessage = null;

		const result = await loadCommitPage(null);
		errorMessage = result.errorMessage;
		commits = result.commits;
		cursor = result.nextCursor;
		hasMore = result.hasMore;

		// Fall back to the newest commit only when the URL did not name one.
		if (!selectedCommitId) {
			selectedCommitId = commits[0]?.commitId ?? null;
			writeSelectionToUrl();
		}
		isLoading = false;
	}

	async function loadMore(): Promise<void> {
		if (isLoadingMore || !hasMore) return;
		isLoadingMore = true;

		const result = await loadCommitPage(cursor);
		if (result.errorMessage) {
			errorMessage = result.errorMessage;
		} else {
			commits = [...commits, ...result.commits];
			cursor = result.nextCursor;
			hasMore = result.hasMore;
		}
		isLoadingMore = false;
	}

	async function retry(): Promise<void> {
		await checkAuth();
		if (isAuthenticated) await loadFirstPage();
	}

	onMount(() => {
		readSelectionFromUrl();
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
			<h1 class="text-sm font-medium">History</h1>
		</div>
		<div class="min-h-0 flex-1">
			<ScrollArea class="h-full w-full">
				{#if isLoading}
					<p class="text-muted-foreground p-4 text-sm">Loading history...</p>
				{:else if hasCheckedAuth && !isAuthenticated}
					<p class="text-muted-foreground p-4 text-xs">
						Sign in to view the commit history.
						<a href="/admin/login" class="underline">Go to login</a>.
					</p>
				{:else if errorMessage}
					<div class="space-y-2 p-4">
						<p class="text-destructive text-xs">{errorMessage}</p>
						<Button variant="outline" size="sm" onclick={retry}>Try again</Button>
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
		<ScrollArea class="h-full w-full">
			{#if selectedCommit}
				<div class="border-border flex h-11 items-center border-b px-4 md:hidden">
					<Button variant="ghost" size="sm" onclick={clearCommit}>Back to history</Button>
				</div>
				<CommitDetail
					commit={selectedCommit}
					{selectedPageId}
					onselectpage={selectPage}
				/>
			{:else if !isLoading && hasCheckedAuth && isAuthenticated && !errorMessage}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					{#if commits.length === 0}
						<p class="text-foreground/80 text-lg font-normal">No history yet</p>
						<p class="text-muted-foreground mt-1 text-sm">
							Commit a change on the
							<a href="/admin/changes" class="underline">Changes page</a>
							and it will show up here.
						</p>
					{:else if selectedCommitId}
						<p class="text-foreground/80 text-lg font-normal">Commit not loaded</p>
						<p class="text-muted-foreground mt-1 text-sm">
							That commit is older than the ones loaded so far. Use “Load more” to reach it.
						</p>
					{:else}
						<p class="text-foreground/80 text-lg font-normal">Select a commit</p>
						<p class="text-muted-foreground mt-1 text-sm">
							Pick one from the list to see what it changed.
						</p>
					{/if}
				</div>
			{/if}
		</ScrollArea>
	</section>
</div>
