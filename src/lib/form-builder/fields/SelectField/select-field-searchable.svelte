<script lang="ts">
  import { tick } from "svelte";
  import { on } from "svelte/events";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import { Button } from "$lib/components/ui/button";
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
  let lastSearchQuery = $state("");
  let triggerRef = $state<HTMLButtonElement | null>(null);
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
  const displaySearchQuery = $derived(open ? searchQuery : lastSearchQuery);
  const filteredData = $derived(
    filterResolvedData(resolvedData, displaySearchQuery, field),
  );
  const filteredCount = $derived(countResolvedOptions(filteredData));
  const useGrid = $derived(hasMultipleColumns(field));
  const gridStyle = $derived(getGridInlineStyle(field));
  const dropdownMinWidth = $derived(getDropdownMinWidth(field));
  const highlightEnabled = $derived(field.highlightMatches ?? false);

  $effect(() => {
    if (!open) return;
    lastSearchQuery = searchQuery;
  });

  $effect(() => {
    if (!open || typeof window === "undefined") return;

    const closePopover = () => {
      open = false;
    };

    const closeOnIframePointerDown = (event: PointerEvent) => {
      if (event.target instanceof HTMLIFrameElement) {
        closePopover();
      }
    };

    const cleanupPointerDown = on(document, "pointerdown", closeOnIframePointerDown, {
      capture: true,
    });
    const cleanupWindowBlur = on(window, "blur", closePopover);

    return () => {
      cleanupPointerDown();
      cleanupWindowBlur();
    };
  });

  function handleOpenChange(nextOpen: boolean): void {
    open = nextOpen;
    if (nextOpen) {
      searchQuery = "";
      contentWidth = triggerRef?.offsetWidth;
    }
  }

  async function closeAndFocusTrigger(): Promise<void> {
    open = false;
    await tick();
    triggerRef?.focus();
  }

  function selectOption(option: { value: string; disabled?: boolean }): void {
    if (option.disabled) return;

    if (field.multiple) {
      onValueChange(toggleSelectValue(multipleValue, option.value));
      return;
    }

    onValueChange(option.value);
    void closeAndFocusTrigger();
  }
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
  <Popover.Trigger bind:ref={triggerRef}>
    {#snippet child({ props })}
      <Button
        {...props}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
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
    {/snippet}
  </Popover.Trigger>

  <Popover.Content
    align="start"
    class="max-h-80 w-auto p-0"
    style={[
      contentWidth ? `width:${contentWidth}px` : "",
      dropdownMinWidth ? `min-width:${dropdownMinWidth}` : "",
    ]
      .filter(Boolean)
      .join(";") || undefined}
  >
    <Command.Root shouldFilter={false} class="max-h-80 rounded-md">
      <Command.Input
        bind:value={searchQuery}
        placeholder={field.searchPlaceholder ?? "Search..."}
      />
      <Command.List class="max-h-64">
        <Command.Empty>
          {field.emptyMessage ?? "No results found."}
        </Command.Empty>
        {#if filteredCount > 0}
          <SelectFieldSearchableList
            {field}
            data={filteredData}
            {selectId}
            value={normalizedValue}
            searchQuery={displaySearchQuery}
            {useGrid}
            {gridStyle}
            {highlightEnabled}
            onSelect={selectOption}
          />
        {/if}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
