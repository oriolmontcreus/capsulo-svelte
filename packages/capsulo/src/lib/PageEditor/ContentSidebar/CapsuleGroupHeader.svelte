<script lang="ts">
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import CapsuleInfoTooltip from "./CapsuleInfoTooltip.svelte";
  import { t } from "../../admin-i18n/i18n.svelte";

  type Props = {
    title: string;
    capsuleKey: string;
    instanceIds: string[];
    isExpanded: boolean;
    panelId: string;
    /** Validation problems in this capsule's instances. */
    issueCount?: number;
    onShowErrors?: () => void;
    onToggle: () => void;
  };

  let {
    title,
    capsuleKey,
    instanceIds,
    isExpanded,
    panelId,
    issueCount = 0,
    onShowErrors,
    onToggle,
  }: Props = $props();
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
    <span class="truncate text-sm font-normal">{title}</span>
  </button>
  {#if issueCount > 0}
    <button
      type="button"
      class="bg-destructive/10 text-destructive hover:bg-destructive/15 my-auto mr-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
      title={t("sidebar.showIssues")}
      onclick={onShowErrors}
    >
      {t("sidebar.issueCount", { count: issueCount })}
    </button>
  {/if}
  <CapsuleInfoTooltip {capsuleKey} {instanceIds} />
</div>
