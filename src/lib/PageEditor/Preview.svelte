<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { LOCALES, DEFAULT_LOCALE } from "$lib/config/i18n-config";
  import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
  import {
    PAGE_EDITOR_PREVIEW_CHANNEL,
    PAGE_EDITOR_PREVIEW_PARAM,
    isPageEditorPreviewMessage,
    type PageEditorPreviewReadyMessage,
    type PageEditorPreviewSyncMessage,
  } from "$lib/PageEditor/preview-channel";
  import { formatLocaleLabel } from "$lib/utils/locale-label";
  import {
    clampPreviewDimension,
    DEFAULT_PREVIEW_DEVICE,
    getPreviewDeviceDimensions,
    getPreviewDeviceLabel,
    PREVIEW_DIMENSION_MAX,
    PREVIEW_DIMENSION_MIN,
    getPreviewDevicesByCategory,
    PREVIEW_DEVICE_GROUPS,
    resolvePreviewDevice,
    type PreviewDeviceId,
  } from "$lib/PageEditor/preview-devices";

  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import Copy from "@lucide/svelte/icons/copy";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Maximize2 from "@lucide/svelte/icons/maximize-2";
  import Minimize2 from "@lucide/svelte/icons/minimize-2";

  type Props = {
    pageId: string;
    valuesByInstance: PageEditorValuesByInstance;
    previewDevice: PreviewDeviceId;
    previewWidthPx: number;
    previewHeightPx: number;
    locale: string;
  };

  let {
    pageId,
    valuesByInstance,
    previewDevice = $bindable(),
    previewWidthPx = $bindable(),
    previewHeightPx = $bindable(),
    locale = $bindable(),
  }: Props = $props();

  const ghostSelectTriggerClass =
    "text-muted-foreground hover:text-foreground h-7 min-w-0 gap-0.5 border-0 bg-transparent px-1 text-xs shadow-none hover:bg-transparent focus-visible:ring-1 dark:bg-transparent dark:hover:bg-transparent [&_svg]:size-3";

  const ghostDimensionInputClass =
    "h-7 [appearance:textfield] border-0 bg-transparent px-0 text-center text-xs shadow-none tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  let iframeEl = $state<HTMLIFrameElement | null>(null);
  let previewRootEl = $state<HTMLElement | null>(null);
  let previewViewportEl = $state<HTMLDivElement | null>(null);
  let iframeWrapperEl = $state<HTMLDivElement | null>(null);
  let iframeHeight = $state("100%");
  let isFullscreen = $state(false);

  let iframeResizeObserver: ResizeObserver | null = null;
  let viewportResizeObserver: ResizeObserver | null = null;

  const previewPath = $derived.by(() => {
    const normalizedPageId = pageId.trim();
    if (!normalizedPageId || normalizedPageId === "index") {
      return "/";
    }
    const encodedSegments = normalizedPageId
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment));
    return `/${encodedSegments.join("/")}`;
  });

  const previewUrl = $derived.by(() => {
    const params = new URLSearchParams({
      [PAGE_EDITOR_PREVIEW_PARAM]: "1",
    });
    return `${previewPath}?${params.toString()}`;
  });

  const previewAbsoluteUrl = $derived.by(() => {
    if (typeof window === "undefined") return previewUrl;
    return new URL(previewUrl, window.location.origin).toString();
  });

  function toSerializableValues(): PageEditorValuesByInstance {
    try {
      return JSON.parse(
        JSON.stringify(valuesByInstance ?? {}),
      ) as PageEditorValuesByInstance;
    } catch {
      return {};
    }
  }

  function buildSyncMessage(): PageEditorPreviewSyncMessage {
    return {
      channel: PAGE_EDITOR_PREVIEW_CHANNEL,
      type: "state-sync",
      pageId,
      locale,
      valuesByInstance: toSerializableValues(),
    };
  }

  function postSyncState(): void {
    if (typeof window === "undefined") return;
    const contentWindow = iframeEl?.contentWindow;
    if (!contentWindow) return;
    const payload = buildSyncMessage();
    contentWindow.postMessage(payload, window.location.origin);
  }

  function getIframeDocument(): Document | null {
    const contentWindow = iframeEl?.contentWindow;
    if (!contentWindow) return null;
    try {
      if (contentWindow.location.origin !== window.location.origin) return null;
      return contentWindow.document;
    } catch {
      return null;
    }
  }

  function getViewportAreaHeight(): number {
    return Math.max(previewViewportEl?.clientHeight ?? 0, 0);
  }

  function updateIframeHeight(): void {
    if (typeof window === "undefined") return;
    const iframeDoc = getIframeDocument();
    if (!iframeDoc) return;

    const documentElement = iframeDoc.documentElement;
    const body = iframeDoc.body;
    const contentHeight = Math.max(
      documentElement?.scrollHeight ?? 0,
      documentElement?.offsetHeight ?? 0,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
      body?.clientHeight ?? 0
    );

    const nextHeight = Math.max(contentHeight, getViewportAreaHeight());
    iframeHeight = `${nextHeight}px`;
  }

  function disconnectIframeObservers(): void {
    iframeResizeObserver?.disconnect();
    iframeResizeObserver = null;
  }

  function setupIframeAutoHeight(): void {
    disconnectIframeObservers();

    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
      return;
    }

    const iframeDoc = getIframeDocument();
    if (!iframeDoc) return;

    updateIframeHeight();

    iframeResizeObserver = new ResizeObserver(() => {
      updateIframeHeight();
    });

    iframeResizeObserver.observe(iframeDoc.documentElement);
    if (iframeDoc.body) {
      iframeResizeObserver.observe(iframeDoc.body);
    }
  }

  function syncFullscreenState(): void {
    if (typeof document === "undefined") return;
    const fullscreenElement = document.fullscreenElement;
    isFullscreen = !!(
      previewRootEl &&
      fullscreenElement &&
      (fullscreenElement === previewRootEl ||
        previewRootEl.contains(fullscreenElement))
    );
  }

  async function toggleFullscreen(): Promise<void> {
    if (typeof document === "undefined" || !previewRootEl) return;
    try {
      if (isFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await previewRootEl.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen request failures (e.g. browser policy).
    }
  }

  function syncDimensionsFromViewport(): void {
    if (!previewViewportEl) return;
    const width = Math.round(previewViewportEl.clientWidth);
    const height = Math.round(previewViewportEl.clientHeight);
    if (width > 0) previewWidthPx = clampPreviewDimension(width);
    if (height > 0) previewHeightPx = clampPreviewDimension(height);
  }

  function syncDeviceFromDimensions(): void {
    previewWidthPx = clampPreviewDimension(previewWidthPx);
    previewHeightPx = clampPreviewDimension(previewHeightPx);
    previewDevice = resolvePreviewDevice(
      previewWidthPx,
      previewHeightPx,
      previewDevice,
    );
  }

  function resetPreview(): void {
    previewDevice = DEFAULT_PREVIEW_DEVICE;
    syncDimensionsFromViewport();

    const iframeDoc = getIframeDocument();
    if (iframeDoc) {
      iframeDoc.defaultView?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      iframeDoc.documentElement.scrollTop = 0;
      if (iframeDoc.body) iframeDoc.body.scrollTop = 0;
    }

    postSyncState();
    updateIframeHeight();
  }

  function handleIframeLoad(): void {
    postSyncState();
    setupIframeAutoHeight();
    updateIframeHeight();
  }

  async function copyPreviewUrl(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(previewAbsoluteUrl);
  }

  function openPreviewInNewTab(): void {
    if (typeof window === "undefined") return;
    window.open(previewAbsoluteUrl, "_blank", "noopener,noreferrer");
  }

  $effect(() => {
    pageId;
    locale;
    valuesByInstance;
    if (typeof window === "undefined") return;
    const contentWindow = iframeEl?.contentWindow;
    if (!contentWindow) return;
    const message = buildSyncMessage();
    contentWindow.postMessage(message, window.location.origin);
  });

  $effect(() => {
    previewDevice;
    previewWidthPx;
    previewHeightPx;
  });

  $effect(() => {
    const device = previewDevice;
    const dims = getPreviewDeviceDimensions(device);
    if (!dims) return;
    previewWidthPx = dims.widthPx;
    previewHeightPx = dims.heightPx;
  });

  onMount(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      if (!isPageEditorPreviewMessage(event.data)) return;
      if (event.data.type !== "ready") return;
      const readyMessage = event.data as PageEditorPreviewReadyMessage;
      if (readyMessage.pageId !== pageId) return;
      postSyncState();
    };

    const handleFullscreenChange = () => {
      syncFullscreenState();
    };

    const handleWindowResize = () => {
      updateIframeHeight();
    };

    if (typeof ResizeObserver !== "undefined") {
      viewportResizeObserver = new ResizeObserver(() => {
        updateIframeHeight();
      });
      if (previewViewportEl) {
        viewportResizeObserver.observe(previewViewportEl);
      }
      if (iframeWrapperEl) {
        viewportResizeObserver.observe(iframeWrapperEl);
      }
    }

    window.addEventListener("message", handleMessage);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleWindowResize);
    syncFullscreenState();
    requestAnimationFrame(() => {
      syncDimensionsFromViewport();
    });

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleWindowResize);
      viewportResizeObserver?.disconnect();
      viewportResizeObserver = null;
      disconnectIframeObservers();
    };
  });
</script>

<main
  bind:this={previewRootEl}
  class="bg-muted/40 flex min-w-0 flex-1 flex-col overflow-hidden"
  aria-label="Preview"
>
  <header
    class="border-border flex h-fit shrink-0 justify-between items-center gap-3 border-b px-3"
  >
    <!-- Left cluster (intentionally empty in preview pane) -->
    <div class="min-w-0"></div>

    <!-- Center cluster -->
    <div class="flex items-center gap-0.5">
      <Select.Root type="single" bind:value={previewDevice}>
        <Select.Trigger
          size="sm"
          aria-label="Preview dimensions"
          class={ghostSelectTriggerClass}
        >
          {getPreviewDeviceLabel(previewDevice)}
        </Select.Trigger>
        <Select.Content class="max-h-72 min-w-44">
          <Select.Item value="responsive" class="text-xs">Responsive</Select.Item>
          {#each PREVIEW_DEVICE_GROUPS as group (group.category)}
            {@const devices = getPreviewDevicesByCategory(group.category)}
            {#if devices.length > 0}
              <Select.Group>
                <Select.GroupHeading>{group.label}</Select.GroupHeading>
                {#each devices as device (device.id)}
                  <Select.Item value={device.id} class="text-xs">{device.label}</Select.Item>
                {/each}
              </Select.Group>
            {/if}
          {/each}
        </Select.Content>
      </Select.Root>

      <div class="flex items-center gap-0.5" aria-label="Preview size">
        <input
          type="number"
          aria-label="Preview width"
          min={PREVIEW_DIMENSION_MIN}
          max={PREVIEW_DIMENSION_MAX}
          bind:value={previewWidthPx}
          onchange={syncDeviceFromDimensions}
          class="{ghostDimensionInputClass} text-foreground w-11"
        />
        <span class="text-muted-foreground/60 select-none text-xs" aria-hidden="true">×</span>
        <input
          type="number"
          aria-label="Preview height"
          min={PREVIEW_DIMENSION_MIN}
          max={PREVIEW_DIMENSION_MAX}
          bind:value={previewHeightPx}
          onchange={syncDeviceFromDimensions}
          class="{ghostDimensionInputClass} text-muted-foreground w-11"
        />
      </div>

      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon-sm"
              aria-label="Reset preview"
              onclick={resetPreview}
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
        <Select.Trigger
          size="sm"
          aria-label="Preview locale"
          class={ghostSelectTriggerClass}
        >
          {formatLocaleLabel(locale || DEFAULT_LOCALE)}
        </Select.Trigger>
        <Select.Content align="end" class="min-w-44">
          {#each LOCALES as localeCode (localeCode)}
            <Select.Item value={localeCode} class="text-xs">
              {formatLocaleLabel(localeCode)}
            </Select.Item>
          {/each}
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
              onclick={copyPreviewUrl}
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
              onclick={openPreviewInNewTab}
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
              aria-label={isFullscreen ? "Exit fullscreen preview" : "Fullscreen preview"}
              onclick={toggleFullscreen}
            >
              {#if isFullscreen}
                <Minimize2 />
              {:else}
                <Maximize2 />
              {/if}
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>
          {isFullscreen ? "Exit fullscreen preview" : "Fullscreen preview"}
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </header>

  <div
    bind:this={previewViewportEl}
    class="flex min-h-0 flex-1 items-stretch justify-center overflow-auto p-6"
  >
    <div
      bind:this={iframeWrapperEl}
      class="bg-background border-border flex shrink-0 flex-col overflow-auto rounded-md border shadow-sm transition-[width,height] duration-200"
      style:width="{previewWidthPx}px"
      style:height="{previewHeightPx}px"
      style:max-width="100%"
      style:max-height="100%"
    >
      <iframe
        bind:this={iframeEl}
        title="Page preview"
        class="w-full border-0"
        style:height={iframeHeight}
        src={previewUrl}
        onload={handleIframeLoad}
      ></iframe>
    </div>
  </div>
</main>
