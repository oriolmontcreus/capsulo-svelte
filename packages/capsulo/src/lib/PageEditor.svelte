<script lang="ts">
  import { onMount } from "svelte";
  import * as Tooltip from "./components/ui/tooltip";
  import { DEFAULT_LOCALE } from "./config/i18n-config";
  import type { PageEditorValuesByInstance } from "./PageEditor/persistence";
  import {
    ensureGlobalsLoaded,
    globalsStore,
  } from "./globals/globals-store.svelte";
  import GlobalVariablesProvider from "./globals/variable-autocomplete/GlobalVariablesProvider.svelte";
  import { buildVariableItems } from "./globals/variable-autocomplete/build-variable-items";
  import { formatVariablePreviewFromValues } from "./globals/variable-autocomplete/format-variable-preview";

  import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage,
  } from "./components/ui/breadcrumb";

  import ContentSidebar from "./PageEditor/ContentSidebar";
  import type { FieldFocusTarget } from "./PageEditor/ContentSidebar/types";
  import { LOCALES } from "./config/i18n-config";
  import "./PageEditor/ContentSidebar/capsule-group-colors.css";
  import Preview from "./PageEditor/Preview.svelte";
  import {
    DEFAULT_PREVIEW_DEVICE,
    type PreviewDeviceId,
  } from "./PageEditor/preview-devices";
  import { Button } from "./components/ui/button";
  import { t } from "./admin-i18n/i18n.svelte";
  type Props = {
    pageId?: string;
    entries?: import("./capsules/core/types").CapsuleManifestEntry[];
  };

  let { pageId, entries = [] }: Props = $props();

  // "Fix this" links from the Changes page: /admin/page-editor/<page>?focus=<instance>&field=<path>&locale=<code>
  let focusTarget = $state<FieldFocusTarget | null>(null);
  let showAllErrors = $state(false);

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

  function getPreview(key: string): string {
    return formatVariablePreviewFromValues(key, globalsStore.values, locale);
  }

  function getVariableItems() {
    return buildVariableItems(globalsStore.values, locale);
  }

  onMount(() => {
    void ensureGlobalsLoaded();

    const params = new URLSearchParams(window.location.search);
    const instanceId = params.get("focus");
    const field = params.get("field");
    const requestedLocale = params.get("locale");
    if (requestedLocale && LOCALES.includes(requestedLocale)) locale = requestedLocale;
    if (instanceId && field) {
      focusTarget = { instanceId, path: field.split(".") };
      showAllErrors = true;
    }
  });
</script>

<Tooltip.Provider delayDuration={150}>
  <GlobalVariablesProvider {getPreview} {getVariableItems}>
  <div
    class="page-editor bg-background text-foreground flex h-full w-full flex-col overflow-hidden"
  >
    <!-- Navbar -->
    <nav
      class="border-border flex h-11 shrink-0 items-center justify-between border-b px-4"
    >
      <Breadcrumb>
        <BreadcrumbList class="text-xs">
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/page-editor">
              {t("pageEditor.pages")}
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
        href="/admin/changes"
        class="h-7 px-3 text-white rounded-full border border-card"
      >
        {t("pageEditor.reviewChanges")}
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
        {focusTarget}
        bind:showAllErrors
      />

      <!-- Resizer -->
      <div
        role="separator"
        aria-label={t("pageEditor.resizeSidebar")}
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
        globalsValues={globalsStore.loaded ? globalsStore.values : null}
        bind:previewDevice
        bind:previewWidthPx
        bind:previewHeightPx
        bind:locale
      />
    </div>
  </div>
  </GlobalVariablesProvider>
</Tooltip.Provider>
