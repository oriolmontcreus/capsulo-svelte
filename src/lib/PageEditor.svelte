<script lang="ts">
  import { onMount } from "svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
  import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
  import type { SchemaValues } from "$lib/form-builder/core/types";
  import { getGlobalsKnownKeys } from "$lib/globals/get-globals";
  import { loadGlobalsDocumentFromDb } from "$lib/globals/globals-documents";
  import { resolveGlobalsValues } from "$lib/globals/resolve-globals";
  import GlobalVariablesProvider from "$lib/globals/variable-autocomplete/GlobalVariablesProvider.svelte";
  import { formatVariablePreviewValue } from "$lib/globals/variable-autocomplete/format-variable-preview";

  import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage,
  } from "$lib/components/ui/breadcrumb";

  import ContentSidebar from "./PageEditor/ContentSidebar";
  import "./PageEditor/ContentSidebar/capsule-group-colors.css";
  import Preview from "./PageEditor/Preview.svelte";
  import {
    DEFAULT_PREVIEW_DEVICE,
    type PreviewDeviceId,
  } from "$lib/PageEditor/preview-devices";
  import { Button } from "$lib/components/ui/button";
  type Props = {
    pageId?: string;
    entries?: import("$lib/capsules/core/types").CapsuleManifestEntry[];
  };

  let { pageId, entries = [] }: Props = $props();

  let previewDevice = $state<PreviewDeviceId>(DEFAULT_PREVIEW_DEVICE);
  let previewWidthPx = $state(390);
  let previewHeightPx = $state(844);
  let locale = $state<string>(DEFAULT_LOCALE);
  let valuesByInstance = $state<PageEditorValuesByInstance>({});

  const sidebarMinWidth = 280;
  const sidebarMaxWidth = 520;
  let sidebarWidth = $state<number>(320);
  let isResizingSidebar = $state(false);

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

  let saveControls = $state({
    save: async () => {},
    disabled: true,
    isSaving: false,
  });

  let globalsValues = $state<SchemaValues>({});
  const knownKeys = getGlobalsKnownKeys();

  const resolvedGlobals = $derived(
    resolveGlobalsValues(globalsValues, locale, DEFAULT_LOCALE),
  );

  function getPreview(key: string): string {
    return formatVariablePreviewValue(key, resolvedGlobals[key], knownKeys);
  }

  onMount(() => {
    void loadGlobalsDocumentFromDb().then((result) => {
      if (!result.errorMessage) {
        globalsValues = result.values;
      }
    });
  });
</script>

<Tooltip.Provider delayDuration={150}>
  <GlobalVariablesProvider {locale} {knownKeys} {getPreview}>
  <div
    class="page-editor bg-background text-foreground flex h-dvh w-full flex-col overflow-hidden"
  >
    <!-- Navbar -->
    <nav
      class="border-border flex h-11 shrink-0 items-center justify-between border-b px-4"
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
                  {segment}
                </BreadcrumbLink>
              {:else}
                <BreadcrumbPage>
                  {segment}
                </BreadcrumbPage>
              {/if}
            </BreadcrumbItem>
          {/each}
        </BreadcrumbList>
      </Breadcrumb>

      <Button
        size="sm"
        class="h-7 px-3 text-white rounded-full border border-card"
        onclick={() => saveControls.save()}
        disabled={saveControls.disabled}
      >
        {saveControls.isSaving ? "Saving..." : "Save"}
      </Button>
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
        bind:saveControls
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
        bind:previewDevice
        bind:previewWidthPx
        bind:previewHeightPx
        bind:locale
      />
    </div>
  </div>
  </GlobalVariablesProvider>
</Tooltip.Provider>
