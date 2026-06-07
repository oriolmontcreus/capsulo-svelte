<script lang="ts">
	import type { Snippet } from "svelte";

	import * as Popover from "$lib/components/ui/popover";
	import { cn } from "$lib/utils";

	import type { VariableItem } from "./types";

	type Props = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSelect: (item: VariableItem) => void;
		searchQuery: string;
		selectedIndex: number;
		items: VariableItem[];
		anchorRect?: DOMRect | null;
		children: Snippet;
	};

	let {
		open,
		onOpenChange,
		onSelect,
		searchQuery,
		selectedIndex,
		items,
		anchorRect = null,
		children
	}: Props = $props();

	let listEl = $state<HTMLUListElement | undefined>();
	let virtualAnchorEl = $state<HTMLSpanElement | undefined>();
	let lastAnchorRect = $state<DOMRect | null>(null);
	let lastSearchQuery = $state("");
	let lastItems = $state<VariableItem[]>([]);
	let lastSelectedIndex = $state(0);

	const effectiveAnchorRect = $derived(anchorRect ?? lastAnchorRect);
	const displaySearchQuery = $derived(open ? searchQuery : lastSearchQuery);
	const displayItems = $derived(open ? items : lastItems);
	const displaySelectedIndex = $derived(open ? selectedIndex : lastSelectedIndex);

	$effect(() => {
		if (anchorRect) lastAnchorRect = anchorRect;
	});

	$effect(() => {
		if (!open) return;
		lastSearchQuery = searchQuery;
		lastItems = items;
		lastSelectedIndex = selectedIndex;
	});

	$effect(() => {
		if (!virtualAnchorEl || !effectiveAnchorRect) return;

		virtualAnchorEl.style.position = "fixed";
		virtualAnchorEl.style.top = `${effectiveAnchorRect.top}px`;
		virtualAnchorEl.style.left = `${effectiveAnchorRect.left}px`;
		virtualAnchorEl.style.width = "1px";
		virtualAnchorEl.style.height = `${Math.max(effectiveAnchorRect.height, 1)}px`;
		virtualAnchorEl.style.pointerEvents = "none";
	});

	$effect(() => {
		if (!open || !listEl) return;
		const activeItem = listEl.children[displaySelectedIndex] as HTMLElement | undefined;
		activeItem?.scrollIntoView({ block: "nearest" });
	});

	const selectedItem = $derived(displayItems[displaySelectedIndex]);
</script>

<div class="relative w-full">
	{@render children()}

	<span bind:this={virtualAnchorEl} aria-hidden="true" class="pointer-events-none"></span>

	{#if effectiveAnchorRect}
		<Popover.Root {open} {onOpenChange}>
			<Popover.Trigger class="sr-only" tabindex={-1} aria-hidden="true"></Popover.Trigger>
			<Popover.Content
				customAnchor={virtualAnchorEl}
				align="start"
				sideOffset={5}
				class="z-[60] w-[500px] p-0"
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<div class="flex h-[300px]">
					<div class="flex w-1/2 flex-col border-r">
						<div class="text-muted-foreground bg-muted/30 border-b p-2 text-xs">
							<span class="font-semibold">Variables</span>
							{#if displaySearchQuery}
								<span class="ml-1 opacity-70">- Filtering by "{displaySearchQuery}"</span>
							{/if}
						</div>
						<div class="flex-1 overflow-y-auto">
							{#if displayItems.length === 0}
								<div class="text-muted-foreground py-2 text-center text-sm">
									No variables found.
								</div>
							{:else}
								<ul bind:this={listEl}>
									{#each displayItems as item, index (item.key)}
										<li>
											<button
												type="button"
												class={cn(
													"relative flex w-full cursor-pointer select-none items-center rounded-none border-b px-2 py-1.5 text-sm outline-none transition-colors",
													index === displaySelectedIndex
														? "bg-accent text-accent-foreground"
														: "hover:bg-accent/50"
												)}
												onclick={() => onSelect(item)}
											>
												<div class="flex w-full items-center gap-2 overflow-hidden">
													<span
														class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-200 text-xs font-bold text-blue-700 dark:bg-blue-800/40 dark:text-blue-300"
													>
														G
													</span>
													<span class="truncate font-medium">{item.key}</span>
												</div>
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>

					<div class="bg-muted/10 flex w-1/2 flex-col">
						<div class="text-muted-foreground bg-muted/30 border-b p-2 text-xs">
							<span class="font-semibold">Details</span>
						</div>
						{#if selectedItem}
							<div class="space-y-4 overflow-y-auto p-4">
								<div>
									<h4 class="text-muted-foreground mb-1 text-xs font-semibold">Value</h4>
									<div class="break-all text-sm">
										{#if selectedItem.value}
											{selectedItem.value}
										{:else}
											<span class="text-muted-foreground italic">Empty</span>
										{/if}
									</div>
								</div>
								<div>
									<h4 class="text-muted-foreground mb-1 text-xs font-semibold">Scope</h4>
									<div class="flex items-center gap-2">
										<span
											class="flex h-5 w-5 items-center justify-center rounded bg-blue-200 text-[10px] font-bold text-blue-700 dark:bg-blue-800/40 dark:text-blue-300"
										>
											G
										</span>
										<span class="text-sm">{selectedItem.scope}</span>
									</div>
								</div>
							</div>
						{:else}
							<div
								class="text-muted-foreground flex flex-1 items-center justify-center text-sm italic"
							>
								Select a variable to view details
							</div>
						{/if}
					</div>
				</div>
			</Popover.Content>
		</Popover.Root>
	{/if}
</div>
