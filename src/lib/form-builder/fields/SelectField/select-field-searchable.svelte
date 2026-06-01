<script lang="ts">
  import { Popover } from "bits-ui";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { cn } from "$lib/utils";
  import SelectFieldSearchableList from "./SelectFieldSearchableList.svelte";
  import type { SelectFieldDefinition } from "./select-field.types";
  import {
    countResolvedOptions,
    filterResolvedData,
  } from "./modules/search-logic";
  import {
    createSelectGridId,
    getDropdownMinWidth,
    getGridInlineStyle,
    hasMultipleColumns,
  } from "./modules/responsive-styles";
  import { getAllOptions, resolveSelectData } from "./modules/resolve-options";
  import {
    formatSelectTriggerLabel,
    normalizeSelectValue,
    toggleSelectValue,
  } from "./modules/select-value";

  interface Props {
    field: SelectFieldDefinition;
    value: string | string[];
    onValueChange: (value: string | string[]) => void;
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
  const normalizedValue = $derived(normalizeSelectValue(field, value));
  const singleValue = $derived(
    field.multiple ? "" : (normalizedValue as string),
  );
  const multipleValue = $derived(
    field.multiple ? (normalizedValue as string[]) : [],
  );
  const selectedOption = $derived(
    allOptions.find((option) => option.value === singleValue),
  );
  const triggerLabel = $derived(
    field.multiple
      ? formatSelectTriggerLabel(field, multipleValue, allOptions)
      : singleValue
        ? (selectedOption?.label ?? singleValue)
        : (field.placeholder ?? "Select an option"),
  );
  const hasSelection = $derived(
    field.multiple ? multipleValue.length > 0 : Boolean(singleValue),
  );
  const filteredData = $derived(
    filterResolvedData(resolvedData, searchQuery, field),
  );
  const filteredCount = $derived(countResolvedOptions(filteredData));
  const useGrid = $derived(hasMultipleColumns(field));
  const gridStyle = $derived(getGridInlineStyle(field));
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

  function selectOption(option: { value: string; disabled?: boolean }): void {
    if (option.disabled) return;

    if (field.multiple) {
      onValueChange(toggleSelectValue(multipleValue, option.value));
      return;
    }

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
            !hasSelection && "text-muted-foreground",
          )}
        >
          <span class="truncate">
            {triggerLabel}
          </span>
          <ChevronDownIcon class="text-muted-foreground size-4 shrink-0 pointer-events-none" />
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
          {:else}
            <SelectFieldSearchableList
              {field}
              data={filteredData}
              {selectId}
              value={normalizedValue}
              {searchQuery}
              {useGrid}
              {gridStyle}
              {highlightEnabled}
              onSelect={selectOption}
            />
          {/if}
        </div>
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
