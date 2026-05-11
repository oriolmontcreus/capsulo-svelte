<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { DEFAULT_LOCALE } from "$lib/config/i18n-config";

  import ContentSidebar from "./PageEditor/ContentSidebar.svelte";
  import Preview from "./PageEditor/Preview.svelte";

  type Viewport = "desktop" | "tablet" | "mobile";
  type Props = {
    pageId?: string;
    entries?: import("$lib/capsules/core/types").CapsuleManifestEntry[];
  };

  let { pageId, entries = [] } = $props<Props>();

  let viewport = $state<Viewport>("desktop");
  let locale = $state<string>(DEFAULT_LOCALE);

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
</script>

<Tooltip.Provider delayDuration={150}>
  <div
    class="bg-background text-foreground flex h-dvh w-full flex-col overflow-hidden"
  >
    <!-- Body -->
    <div class="flex min-h-0 flex-1" class:select-none={isResizingSidebar}>
      <!-- Sidebar -->
      <ContentSidebar
        pageId={pageId ?? ""}
        {entries}
        width={sidebarWidth}
        bind:locale
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
      <Preview {previewWidth} bind:viewport bind:locale />
    </div>
  </div>
</Tooltip.Provider>
