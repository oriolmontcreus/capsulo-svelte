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
</script>

{#snippet commandItem(option: SelectOption)}
  <Command.Item
    value={option.value}
    disabled={option.disabled}
    class={cn(
      "[&_.cn-command-item-indicator]:hidden",
      option.description && "min-h-12 items-center py-2",
      !option.description && "min-h-9",
    )}
    onSelect={() => onSelect(option)}
  >
    <CheckIcon
      class={cn(
        "size-4 shrink-0",
        !isOptionSelected(option.value) && "text-transparent",
      )}
    />
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
    <Command.Group heading={group.label} value={group.label}>
      {@render optionsList(group.options)}
    </Command.Group>
  {/each}
{:else}
  {@render optionsList(data.options)}
{/if}
