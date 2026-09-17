<script lang="ts">
	import { onMount } from "svelte";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { listChangedPages, getPageChangeSet, type ChangedPageSummary } from "./changed-pages";
	import { commitChanges, type CommitFailure } from "./commit";
	import type { PageChangeSet } from "./diff-model";
	import ChangesSidebar from "./ChangesSidebar.svelte";
	import CommitForm from "./CommitForm.svelte";
	import PageDiff from "./PageDiff.svelte";

	let changedPages = $state<ChangedPageSummary[]>([]);
	let selectedPageId = $state<string | null>(null);
	let isLoading = $state(true);

	let message = $state("");
	let isCommitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let failures = $state<CommitFailure[]>([]);

	const changeSetPromise = $derived<Promise<PageChangeSet | null>>(
		selectedPageId ? getPageChangeSet(selectedPageId) : Promise.resolve(null),
	);

	async function refresh(): Promise<void> {
		changedPages = await listChangedPages();
		if (!selectedPageId || !changedPages.some((page) => page.pageId === selectedPageId)) {
			selectedPageId = changedPages[0]?.pageId ?? null;
		}
		isLoading = false;
	}

	async function commit(): Promise<void> {
		if (isCommitting) return;
		isCommitting = true;
		errorMessage = null;
		failures = [];

		const result = await commitChanges(
			message,
			changedPages.map((page) => page.pageId),
		);

		errorMessage = result.errorMessage;
		failures = result.failures;
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
			<h1 class="text-sm font-medium">Changes</h1>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto">
			<ChangesSidebar pages={changedPages} bind:selectedPageId />
		</div>
		<CommitForm
			bind:message
			hasChanges={changedPages.length > 0}
			{isCommitting}
			{errorMessage}
			{failures}
			oncommit={commit}
		/>
	</aside>

	<section class="min-w-0 flex-1">
		<ScrollArea class="h-full w-full">
			<div class="mx-auto max-w-3xl p-6">
				{#if isLoading}
					<p class="text-muted-foreground text-sm">Loading changes...</p>
				{:else if changedPages.length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-center">
						<p class="text-foreground/80 text-lg font-normal">Nothing to commit</p>
						<p class="text-muted-foreground mt-1 text-sm">
							Your local content matches the last committed version.
						</p>
					</div>
				{:else}
					{#await changeSetPromise then changeSet}
						<PageDiff {changeSet} />
					{/await}
				{/if}
			</div>
		</ScrollArea>
	</section>
</div>
