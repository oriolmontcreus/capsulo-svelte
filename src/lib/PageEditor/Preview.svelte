<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Select from "$lib/components/ui/select";
  import * as Tooltip from "$lib/components/ui/tooltip";

  import Monitor from "@lucide/svelte/icons/monitor";
  import Smartphone from "@lucide/svelte/icons/smartphone";
  import Tablet from "@lucide/svelte/icons/tablet";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import Copy from "@lucide/svelte/icons/copy";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Maximize2 from "@lucide/svelte/icons/maximize-2";
  import Image from "@lucide/svelte/icons/image";

  type Viewport = "desktop" | "tablet" | "mobile";

  type Props = {
    previewWidth: string;
    viewport: Viewport;
    locale: string;
  };

  let {
    previewWidth,
    viewport = $bindable<Viewport>(),
    locale = $bindable<string>(),
  } = $props<Props>();
</script>

<main
  class="bg-muted/40 flex min-w-0 flex-1 flex-col overflow-hidden"
  aria-label="Preview"
>
  <header
    class="border-border flex h-14 shrink-0 justify-between items-center gap-3 border-b px-3"
  >
    <!-- Left cluster (intentionally empty in preview pane) -->
    <div class="min-w-0"></div>

    <!-- Center cluster -->
    <div class="flex items-center justify-start gap-1">
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
          <Tabs.Trigger
            value="mobile"
            aria-label="Mobile preview"
            class="px-2.5"
          >
            <Smartphone />
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tablet"
            aria-label="Tablet preview"
            class="px-2.5"
          >
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
    <div class="flex items-center justify-end gap-1 w-full">
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
    </div>
  </header>

  <div class="flex min-h-0 flex-1 items-start justify-center overflow-auto p-6">
    <div
      class="bg-background border-border w-full overflow-hidden rounded-md border shadow-sm transition-[width] duration-200"
      style:width={previewWidth}
      style:max-width="100%"
      style:min-height="100%"
    >
      <!-- Mock site header -->
      <div
        class="border-border flex items-center justify-between border-b px-6 py-4"
      >
        <div class="flex items-center gap-2">
          <div class="bg-muted size-6 rounded-full" aria-hidden="true"></div>
          <div class="bg-muted h-3 w-16 rounded" aria-hidden="true"></div>
        </div>
        <div class="hidden items-center gap-3 sm:flex">
          <div class="bg-muted h-2 w-10 rounded" aria-hidden="true"></div>
          <div class="bg-muted h-2 w-10 rounded" aria-hidden="true"></div>
          <div class="bg-muted h-2 w-10 rounded" aria-hidden="true"></div>
          <div class="bg-muted h-6 w-6 rounded" aria-hidden="true"></div>
        </div>
      </div>

      <!-- Mock hero -->
      <div class="px-6 pt-8 pb-12">
        <div
          class="bg-muted/70 text-muted-foreground relative grid aspect-video w-full place-items-center overflow-hidden rounded-md"
        >
          <div class="flex flex-col items-center gap-2">
            <Image class="size-8 opacity-60" />
            <span class="text-sm">Preview</span>
          </div>
        </div>

        <!-- Mock content rows -->
        <div class="mt-8 space-y-3">
          <div class="bg-muted h-3 w-3/5 rounded" aria-hidden="true"></div>
          <div class="bg-muted h-3 w-4/5 rounded" aria-hidden="true"></div>
          <div class="bg-muted h-3 w-2/5 rounded" aria-hidden="true"></div>
        </div>

        <div class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {#each [1, 2, 3] as i (i)}
            <div class="space-y-2">
              <div
                class="bg-muted/70 aspect-video w-full rounded-md"
                aria-hidden="true"
              ></div>
              <div
                class="bg-muted h-2.5 w-3/4 rounded"
                aria-hidden="true"
              ></div>
              <div class="bg-muted h-2 w-1/2 rounded" aria-hidden="true"></div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</main>
