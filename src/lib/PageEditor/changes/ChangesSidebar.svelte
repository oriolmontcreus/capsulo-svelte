<script lang="ts">
	import type { ChangedPageSummary } from "./changed-pages";

	let {
		pages,
		selectedPageId = $bindable(null),
	}: {
		pages: ChangedPageSummary[];
		selectedPageId?: string | null;
	} = $props();
</script>

{#if pages.length === 0}
	<div class="text-muted-foreground p-4 text-sm">No changes</div>
{:else}
	<ul class="p-2">
		{#each pages as page (page.pageId)}
			{@const active = page.pageId === selectedPageId}
			<li>
				<button
					type="button"
					onclick={() => (selectedPageId = page.pageId)}
					aria-current={active ? "true" : undefined}
					class="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors {active
						? 'bg-primary/20 text-foreground'
						: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
				>
					<span class="truncate">{page.name}</span>
					<span
						class="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums"
					>
						{page.count}
					</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}
