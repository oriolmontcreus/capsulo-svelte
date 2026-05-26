<script lang="ts">
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import CapsuleInfoTooltip from "./CapsuleInfoTooltip.svelte";

  type Props = {
    title: string;
    capsuleKey: string;
    instanceIds: string[];
    isExpanded: boolean;
    panelId: string;
    onToggle: () => void;
  };

  let { title, capsuleKey, instanceIds, isExpanded, panelId, onToggle }: Props =
    $props();
</script>

<div class="capsule-group__header flex w-full items-stretch">
  <button
    type="button"
    class="flex min-w-0 flex-1 cursor-pointer items-center gap-1 bg-transparent px-2 py-1.5 text-left hover:bg-transparent"
    aria-expanded={isExpanded}
    aria-controls={panelId}
    onclick={onToggle}
  >
    <ChevronRightIcon
      class="text-muted-foreground size-3.5 shrink-0 {isExpanded
        ? 'rotate-90'
        : ''}"
      aria-hidden="true"
    />
    <span class="truncate text-sm font-medium">{title}</span>
  </button>
  <CapsuleInfoTooltip {capsuleKey} {instanceIds} />
</div>
