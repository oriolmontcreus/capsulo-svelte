<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Select from "$lib/components/ui/select";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import * as Tooltip from "$lib/components/ui/tooltip";

  import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";
  import Monitor from "@lucide/svelte/icons/monitor";
  import Smartphone from "@lucide/svelte/icons/smartphone";
  import Tablet from "@lucide/svelte/icons/tablet";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import Copy from "@lucide/svelte/icons/copy";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Maximize2 from "@lucide/svelte/icons/maximize-2";
  import X from "@lucide/svelte/icons/x";

  type Viewport = "desktop" | "tablet" | "mobile";

  type Props = {
    viewport: Viewport;
    locale: string;
  };

  let { viewport = $bindable(), locale = $bindable() } = $props<Props>();
</script>

<header
  class="border-border flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3"
>
  <!-- Left cluster -->
  <div class="flex min-w-0 items-center gap-2">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon-sm"
            aria-label="Page options"
          >
            <MoreHorizontal />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" class="w-44">
        <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
        <DropdownMenu.Item>Rename</DropdownMenu.Item>
        <DropdownMenu.Item>Move to folder</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item class="text-destructive">Delete</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <span class="text-sm font-medium">Homepage</span>

    <Button
      size="sm"
      class="ml-1 h-7 bg-emerald-500 px-3 text-white hover:bg-emerald-600"
    >
      Publish
    </Button>
  </div>

  <!-- Center cluster -->
  <div class="flex items-center gap-1">
    <Tabs.Root
      bind:value={() => viewport, (v) => (viewport = v as Viewport)}
      class="contents"
    >
      <Tabs.List class="h-8">
        <Tabs.Trigger
          value="desktop"
          aria-label="Desktop preview"
          class="px-2.5"
        >
          <Monitor />
        </Tabs.Trigger>
        <Tabs.Trigger value="mobile" aria-label="Mobile preview" class="px-2.5">
          <Smartphone />
        </Tabs.Trigger>
        <Tabs.Trigger value="tablet" aria-label="Tablet preview" class="px-2.5">
          <Tablet />
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon-sm"
            aria-label="Reset preview"
          >
            <RotateCcw />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content>Reset preview</Tooltip.Content>
    </Tooltip.Root>
  </div>

  <!-- Right cluster -->
  <div class="flex items-center gap-1">
    <Select.Root type="single" bind:value={locale}>
      <Select.Trigger size="sm" class="h-8 min-w-48 gap-1 text-xs">
        {locale === "en-US"
          ? "English (United States)"
          : locale === "es-ES"
            ? "Spanish (Spain)"
            : "French (France)"}
      </Select.Trigger>
      <Select.Content align="end">
        <Select.Item value="en-US">English (United States)</Select.Item>
        <Select.Item value="es-ES">Spanish (Spain)</Select.Item>
        <Select.Item value="fr-FR">French (France)</Select.Item>
      </Select.Content>
    </Select.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon-sm"
            aria-label="Copy URL"
          >
            <Copy />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content>Copy URL</Tooltip.Content>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon-sm"
            aria-label="Open in new tab"
          >
            <ExternalLink />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content>Open in new tab</Tooltip.Content>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon-sm"
            aria-label="Fullscreen preview"
          >
            <Maximize2 />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content>Fullscreen preview</Tooltip.Content>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon-sm"
            aria-label="Close editor"
          >
            <X />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content>Close editor</Tooltip.Content>
    </Tooltip.Root>
  </div>
</header>
