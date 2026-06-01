<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import { cn } from "$lib/utils";
  import SelectFieldGridStyles from "./SelectFieldGridStyles.svelte";
  import SelectOptionContent from "./SelectOptionContent.svelte";
  import type {
    SelectFieldDefinition,
    SelectOption,
  } from "./select-field.types";
  import type { ResolvedSelectData } from "./modules/resolve-options";
  import { normalizeSelectValue } from "./modules/select-value";

  interface Props {
    field: SelectFieldDefinition;
    data: ResolvedSelectData;
    selectId: string;
    value: string | string[];
    searchQuery: string;
    useGrid: boolean;
    gridStyle: string | undefined;
    highlightEnabled: boolean;
    onSelect: (option: SelectOption) => void;
  }

  let {
    field,
    data,
    selectId,
    value,
    searchQuery,
    useGrid,
    gridStyle,
    highlightEnabled,
    onSelect,
  }: Props = $props();

  const normalizedValue = $derived(normalizeSelectValue(field, value));

  function isOptionSelected(optionValue: string): boolean {
    if (field.multiple) {
      return (normalizedValue as string[]).includes(optionValue);
    }
    return (normalizedValue as string) === optionValue;
  }
</script>

{#snippet optionButton(option: SelectOption)}
  <button
    type="button"
    disabled={option.disabled}
    class={cn(
      "hover:bg-accent cursor-pointer hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground relative flex w-full items-center rounded-sm px-2 py-2 text-left outline-hidden select-none disabled:pointer-events-none disabled:opacity-50",
      isOptionSelected(option.value) && "bg-accent text-accent-foreground",
      option.description ? "min-h-12" : "min-h-9",
    )}
    onclick={() => onSelect(option)}
  >
    <span class="absolute inset-e-2 flex size-3.5 items-center justify-center">
      {#if isOptionSelected(option.value)}
        <CheckIcon class="size-4" />
      {/if}
    </span>
    <div class="pe-6">
      <SelectOptionContent
        {option}
        query={searchQuery}
        highlight={highlightEnabled}
      />
    </div>
  </button>
{/snippet}

{#snippet optionsList(options: SelectOption[])}
  {#if useGrid}
    <div
      data-select-id={selectId}
      class="select-grid-container"
      style={gridStyle}
    >
      {#each options as option (option.value)}
        {@render optionButton(option)}
      {/each}
    </div>
  {:else}
    {#each options as option (option.value)}
      {@render optionButton(option)}
    {/each}
  {/if}
{/snippet}

<SelectFieldGridStyles {field} {selectId} />

{#if data.hasGroups}
  {#each data.groups as group (group.label)}
    <div class="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium">
      {group.label}
    </div>
    {@render optionsList(group.options)}
  {/each}
{:else}
  {@render optionsList(data.options)}
{/if}
