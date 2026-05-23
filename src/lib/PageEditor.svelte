<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
  import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

  import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage,
  } from "$lib/components/ui/breadcrumb";

  import ContentSidebar from "./PageEditor/ContentSidebar.svelte";
  import Preview from "./PageEditor/Preview.svelte";

  type Viewport = "desktop" | "tablet" | "mobile";
  type Props = {
    pageId?: string;
    entries?: import("$lib/capsules/core/types").CapsuleManifestEntry[];
  };

  let { pageId, entries = [] }: Props = $props();

  let viewport = $state<Viewport>("desktop");
  let locale = $state<string>(DEFAULT_LOCALE);
  let valuesByInstance = $state<PageEditorValuesByInstance>({});

  const sidebarMinWidth = 280;
  const sidebarMaxWidth = 520;
  let sidebarWidth = $state<number>(320);
  let isResizingSidebar = $state(false);

  const viewportWidths: Record<Viewport, string> = {
    desktop: "100%",
    tablet: "820px",
    mobile: "390px",
  };

  const previewWidth = $derived(viewportWidths[viewport]);

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function sidebarPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();

    isResizingSidebar = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const pointerId = e.pointerId;
    const target = e.currentTarget as HTMLElement | null;
    target?.setPointerCapture?.(pointerId);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      sidebarWidth = clamp(startWidth + dx, sidebarMinWidth, sidebarMaxWidth);
    };

    const cleanup = () => {
      isResizingSidebar = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);

      try {
        if (target?.hasPointerCapture?.(pointerId))
          target.releasePointerCapture(pointerId);
      } catch {
        // Ignore capture release errors (e.g. already released)
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  }

  const breadcrumbSegments = $derived(
    pageId ? pageId.split("/") : [],
  );

  function displayName(name: string): string {
    return name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
</script>

<Tooltip.Provider delayDuration={150}>
  <div
    class="bg-background text-foreground flex h-dvh w-full flex-col overflow-hidden"
  >
    <!-- Navbar -->
    <nav
      class="border-border flex h-11 shrink-0 items-center border-b px-4"
    >
      <Breadcrumb>
        <BreadcrumbList class="text-xs">
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/page-editor">
              Pages
            </BreadcrumbLink>
          </BreadcrumbItem>

          {#each breadcrumbSegments as segment, i}
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              {#if i < breadcrumbSegments.length - 1}
                {@const segmentPath = breadcrumbSegments.slice(0, i + 1).join("/")}
                <BreadcrumbLink href="/admin/page-editor?path={segmentPath}">
                  {displayName(segment)}
                </BreadcrumbLink>
              {:else}
                <BreadcrumbPage>
                  {displayName(segment)}
                </BreadcrumbPage>
              {/if}
            </BreadcrumbItem>
          {/each}
        </BreadcrumbList>
      </Breadcrumb>
    </nav>

    <!-- Body -->
    <div class="flex min-h-0 flex-1" class:select-none={isResizingSidebar}>
      <!-- Sidebar -->
      <ContentSidebar
        pageId={pageId ?? ""}
        {entries}
        width={sidebarWidth}
        bind:locale
        bind:valuesByInstance
      />

      <!-- Resizer -->
      <div
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin={sidebarMinWidth}
        aria-valuemax={sidebarMaxWidth}
        aria-valuenow={sidebarWidth}
        class="group relative w-2 shrink-0 cursor-col-resize touch-none bg-transparent"
        onpointerdown={sidebarPointerDown}
      >
        <div
          class="bg-border group-hover:bg-muted-foreground/40 absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
        ></div>
      </div>

      <!-- Preview pane -->
      <Preview
        pageId={pageId ?? ""}
        {valuesByInstance}
        {previewWidth}
        bind:viewport
        bind:locale
      />
    </div>
  </div>
</Tooltip.Provider>
