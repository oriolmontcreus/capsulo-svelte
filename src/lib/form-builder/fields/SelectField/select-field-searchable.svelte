<script lang="ts">
	import { Popover } from "bits-ui";
	import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import CheckIcon from "@lucide/svelte/icons/check";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { cn } from "$lib/utils";
	import SelectOptionLabel from "./SelectOptionLabel.svelte";
	import SelectFieldGridStyles from "./SelectFieldGridStyles.svelte";
	import type { SelectFieldDefinition, SelectOption } from "./select-field.types";
	import { countResolvedOptions, filterResolvedData } from "./modules/search-logic";
	import {
		createSelectGridId,
		getBaseGridStyle,
		getDropdownMinWidth,
		hasMultipleColumns,
	} from "./modules/responsive-styles";
	import { getAllOptions, resolveSelectData } from "./modules/resolve-options";

	interface Props {
		field: SelectFieldDefinition;
		value: string;
		onValueChange: (value: string) => void;
		error?: string;
	}

	let { field, value, onValueChange, error }: Props = $props();

	let open = $state(false);
	let searchQuery = $state("");
	let triggerRef = $state<HTMLDivElement | null>(null);
	let contentWidth = $state<number | undefined>(undefined);

	const selectId = createSelectGridId();
	const resolvedData = $derived(resolveSelectData(field));
	const allOptions = $derived(getAllOptions(resolvedData));
	const selectedOption = $derived(allOptions.find((option) => option.value === value));

	const filteredData = $derived(filterResolvedData(resolvedData, searchQuery, field));
	const filteredCount = $derived(countResolvedOptions(filteredData));
	const useGrid = $derived(hasMultipleColumns(field));
	const gridStyle = $derived(useGrid ? getBaseGridStyle(field) : undefined);
	const dropdownMinWidth = $derived(getDropdownMinWidth(field));
	const highlightEnabled = $derived(field.highlightMatches ?? false);

	function handleOpenChange(nextOpen: boolean): void {
		open = nextOpen;
		if (!nextOpen) {
			searchQuery = "";
		} else {
			contentWidth = triggerRef?.offsetWidth;
		}
	}

	function selectOption(option: SelectOption): void {
		if (option.disabled) return;
		onValueChange(option.value);
		open = false;
		searchQuery = "";
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<Popover.Trigger>
		{#snippet child({ props })}
			<div bind:this={triggerRef} class="w-full">
				<Button
					{...props}
					type="button"
					variant="outline"
					aria-invalid={error ? true : undefined}
					class={cn(
						"w-full justify-between font-normal",
						!value && "text-muted-foreground",
					)}
				>
					<span class="truncate">
						{value
							? (selectedOption?.label ?? value)
							: (field.placeholder ?? "Select an option")}
					</span>
					<ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
				</Button>
			</div>
		{/snippet}
	</Popover.Trigger>

	<Popover.Portal>
		<Popover.Content
			class="bg-popover text-popover-foreground z-50 max-h-80 rounded-md border p-0 shadow-md"
			align="start"
			style={[
				contentWidth ? `width:${contentWidth}px` : "",
				dropdownMinWidth ? `min-width:${dropdownMinWidth}` : "",
			]
				.filter(Boolean)
				.join(";") || undefined}
		>
			<div class="flex flex-col">
				<div class="border-b p-2">
					<Input
						type="search"
						bind:value={searchQuery}
						placeholder={field.searchPlaceholder ?? "Search..."}
						class="h-9"
						autocomplete="off"
					/>
				</div>

				<div class="max-h-64 overflow-y-auto p-1">
					{#if filteredCount === 0}
						<p class="text-muted-foreground px-2 py-6 text-center text-sm">
							{field.emptyMessage ?? "No results found."}
						</p>
					{:else if filteredData.hasGroups}
						<SelectFieldGridStyles {field} {selectId} />
						{#each filteredData.groups as group (group.label)}
							<div class="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">
								{group.label}
							</div>
							{#if useGrid}
								<div
									data-select-id={selectId}
									class="select-grid-container"
									style={gridStyle}
								>
									{#each group.options as option (option.value)}
										{@render searchableOption(option, searchQuery)}
									{/each}
								</div>
							{:else}
								{#each group.options as option (option.value)}
									{@render searchableOption(option, searchQuery)}
								{/each}
							{/if}
						{/each}
					{:else if useGrid}
						<SelectFieldGridStyles {field} {selectId} />
						<div
							data-select-id={selectId}
							class="select-grid-container"
							style={gridStyle}
						>
							{#each filteredData.options as option (option.value)}
								{@render searchableOption(option, searchQuery)}
							{/each}
						</div>
					{:else}
						{#each filteredData.options as option (option.value)}
							{@render searchableOption(option, searchQuery)}
						{/each}
					{/if}
				</div>
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

{#snippet searchableOption(option: SelectOption, query: string)}
	<button
		type="button"
		disabled={option.disabled}
		class={cn(
			"hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground relative flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none disabled:pointer-events-none disabled:opacity-50",
			value === option.value && "bg-accent text-accent-foreground",
		)}
		onclick={() => selectOption(option)}
	>
		<span class="absolute inset-e-2 flex size-3.5 items-center justify-center">
			{#if value === option.value}
				<CheckIcon class="size-4" />
			{/if}
		</span>
		<span class="flex min-w-0 flex-col pe-6">
			<span class="truncate">
				<SelectOptionLabel text={option.label} {query} highlight={highlightEnabled} />
			</span>
			{#if option.description}
				<span class="text-muted-foreground truncate text-xs">
					<SelectOptionLabel
						text={option.description}
						{query}
						highlight={highlightEnabled}
					/>
				</span>
			{/if}
		</span>
	</button>
{/snippet}
