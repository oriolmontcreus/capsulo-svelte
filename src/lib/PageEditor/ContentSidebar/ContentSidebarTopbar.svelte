<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import CopyMinusIcon from "@lucide/svelte/icons/copy-minus";

  type Props = {
    disabled?: boolean;
    onCollapseAll: () => void;
  };

  let { disabled = false, onCollapseAll }: Props = $props();
</script>

<header
  class="border-border flex h-8 shrink-0 items-center justify-end border-b"
  aria-label="Content sidebar toolbar"
>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground hover:text-foreground size-7"
          aria-label="Collapse all capsules"
          {disabled}
          onclick={onCollapseAll}
        >
          <CopyMinusIcon class="size-4" />
        </Button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content side="bottom">Collapse all capsules</Tooltip.Content>
  </Tooltip.Root>
</header>
