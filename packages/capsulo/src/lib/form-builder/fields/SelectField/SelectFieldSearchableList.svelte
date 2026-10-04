<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import * as Command from "$lib/components/ui/command";
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

  const itemClass = cn(
    "[&_.cn-command-item-indicator]:hidden",
    "data-selected:bg-accent data-selected:text-accent-foreground",
    "focus:bg-accent focus:text-accent-foreground",
    "relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none",
    "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
  );
</script>

{#snippet commandItem(option: SelectOption)}
  <Command.Item
    value={option.value}
    disabled={option.disabled}
    class={cn(itemClass, option.description && "items-center py-2")}
    onSelect={() => onSelect(option)}
  >
    <span class="absolute inset-e-2 flex size-3.5 items-center justify-center">
      {#if isOptionSelected(option.value)}
        <CheckIcon class="size-4" />
      {/if}
    </span>
    <SelectOptionContent
      {option}
      query={searchQuery}
      highlight={highlightEnabled}
    />
  </Command.Item>
{/snippet}

{#snippet optionsList(options: SelectOption[])}
  {#if useGrid}
    <div
      data-select-id={selectId}
      class="select-grid-container"
      style={gridStyle}
    >
      {#each options as option (option.value)}
        {@render commandItem(option)}
      {/each}
    </div>
  {:else}
    {#each options as option (option.value)}
      {@render commandItem(option)}
    {/each}
  {/if}
{/snippet}

<SelectFieldGridStyles {field} {selectId} />

{#if data.hasGroups}
  {#each data.groups as group (group.label)}
    <Command.Group heading={group.label} value={group.label} class="p-0">
      {@render optionsList(group.options)}
    </Command.Group>
  {/each}
{:else}
  {@render optionsList(data.options)}
{/if}
