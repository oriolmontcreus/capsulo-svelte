<script lang="ts">
  import { get } from "svelte/store";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { getCapsuleByKey } from "$lib/capsules/core/registry";
  import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
  import SchemaRenderer from "$lib/form-builder/renderer/SchemaRenderer.svelte";
  import { session, syncSession } from "$lib/stores/session";
  import { type PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
  import {
    loadPageEditorDocumentFromCache,
    savePageEditorDocumentToCache,
  } from "$lib/PageEditor/page-editor-cache";
  import {
    loadPageEditorDocumentFromDb,
    loadPageEditorDocumentMetadataFromDb,
    savePageEditorDocumentToDb,
  } from "$lib/PageEditor/page-editor-documents";
  import type { CapsuleManifestEntry } from "$lib/capsules/core/types";
  import type { SchemaValues } from "$lib/form-builder/core/types";

  import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";

  type Props = {
    pageId: string;
    entries: CapsuleManifestEntry[];
    locale: string;
    width?: number;
  };

  let {
    pageId,
    entries,
    locale = $bindable(DEFAULT_LOCALE),
    width,
  }: Props = $props();

  type GroupedEntry = {
    capsuleKey: string;
    entries: Array<{ entry: CapsuleManifestEntry; entryIndex: number }>;
  };

  const groupedEntries = $derived.by<GroupedEntry[]>(() => {
    const grouped: Record<string, GroupedEntry> = {};

    entries.forEach((entry, entryIndex) => {
      const existing = grouped[entry.capsuleKey];
      if (existing) {
        existing.entries.push({ entry, entryIndex });
        return;
      }

      grouped[entry.capsuleKey] = {
        capsuleKey: entry.capsuleKey,
        entries: [{ entry, entryIndex }],
      };
    });

    return Object.values(grouped);
  });

  let valuesByInstance = $state<PageEditorValuesByInstance>({});
  let isLoading = $state(true);
  let isBlockingLoad = $state(false);
  let isSyncing = $state(false);
  let isSaving = $state(false);
  let isAuthenticated = $state(false);
  let hasCheckedAuth = $state(false);
  let currentUserId = $state<string | null>(null);
  let hasExistingDocument = $state(false);
  let loadError = $state<string | null>(null);
  let saveError = $state<string | null>(null);
  let saveSuccess = $state<string | null>(null);
  let latestLoadRunId = 0;
  let schemaHydrationVersion = $state(0);

  function isRemoteTimestampNewer(
    remoteUpdatedAt: string | null,
    cacheUpdatedAt: string | null,
  ): boolean {
    if (!remoteUpdatedAt) return false;
    if (!cacheUpdatedAt) return true;
    const remoteMs = Date.parse(remoteUpdatedAt);
    const cacheMs = Date.parse(cacheUpdatedAt);
    if (Number.isNaN(remoteMs) || Number.isNaN(cacheMs))
      return remoteUpdatedAt !== cacheUpdatedAt;
    return remoteMs > cacheMs;
  }

  function handleInstanceValuesChange(
    instanceId: string,
    nextValues: SchemaValues,
  ) {
    valuesByInstance = {
      ...valuesByInstance,
      [instanceId]: nextValues,
    };
  }

  function getCapsuleTitle(capsuleKey: string, componentName: string): string {
    const capsule = getCapsuleByKey(capsuleKey);
    return capsule?.meta?.displayName ?? componentName ?? capsuleKey;
  }

  function applyHydratedValues(
    nextValuesByInstance: PageEditorValuesByInstance,
    _source:
      | "cache-initial"
      | "remote-fallback"
      | "remote-refresh"
      | "unauthenticated-reset",
  ): void {
    valuesByInstance = nextValuesByInstance;
    schemaHydrationVersion += 1;
  }

  async function loadPageEditorDocument(): Promise<void> {
    const loadRunId = ++latestLoadRunId;
    const isCurrentRun = () => loadRunId === latestLoadRunId;

    isLoading = true;
    isBlockingLoad = false;
    isSyncing = false;
    hasCheckedAuth = false;
    loadError = null;
    saveError = null;
    saveSuccess = null;
    hasExistingDocument = false;

    const cachedDocument = await loadPageEditorDocumentFromCache(pageId);
    if (!isCurrentRun()) {
      return;
    }

    if (cachedDocument) {
      applyHydratedValues(cachedDocument.valuesByInstance, "cache-initial");
      hasExistingDocument =
        Boolean(cachedDocument.updatedAt) ||
        Object.keys(cachedDocument.valuesByInstance).length > 0;
      isLoading = false;
      isBlockingLoad = false;
      isSyncing = true;

      let userId = get(session)?.user?.id ?? null;
      if (!userId) {
        await syncSession();
        userId = get(session)?.user?.id ?? null;
      }

      isAuthenticated = Boolean(userId);
      currentUserId = userId;
      hasCheckedAuth = true;
      if (!userId) {
        isSyncing = false;
        return;
      }

      const metadataResult = await loadPageEditorDocumentMetadataFromDb(pageId);
      if (!isCurrentRun()) {
        return;
      }

      if (metadataResult.errorMessage) {
        loadError = metadataResult.errorMessage;
        isSyncing = false;
        return;
      }

      hasExistingDocument = metadataResult.hasExistingDocument;
      const remoteIsNewer = isRemoteTimestampNewer(
        metadataResult.updatedAt,
        cachedDocument.updatedAt,
      );

      if (!remoteIsNewer) {
        isSyncing = false;
        return;
      }

      const remoteLoadResult = await loadPageEditorDocumentFromDb(pageId);
      if (!isCurrentRun()) {
        return;
      }

      if (remoteLoadResult.errorMessage) {
        loadError = remoteLoadResult.errorMessage;
        isSyncing = false;
        return;
      }

      loadError = null;
      applyHydratedValues(remoteLoadResult.valuesByInstance, "remote-refresh");
      hasExistingDocument = remoteLoadResult.hasExistingDocument;
      await savePageEditorDocumentToCache({
        pageId,
        valuesByInstance: remoteLoadResult.valuesByInstance,
        updatedAt: remoteLoadResult.updatedAt,
      });
      isSyncing = false;
      return;
    }

    isBlockingLoad = true;
    let userId = get(session)?.user?.id ?? null;
    if (!userId) {
      await syncSession();
      userId = get(session)?.user?.id ?? null;
    }

    isAuthenticated = Boolean(userId);
    currentUserId = userId;
    hasCheckedAuth = true;

    if (!userId) {
      applyHydratedValues({}, "unauthenticated-reset");
      isLoading = false;
      isBlockingLoad = false;
      return;
    }

    const loadResult = await loadPageEditorDocumentFromDb(pageId);
    if (!isCurrentRun()) return;

    loadError = loadResult.errorMessage;
    applyHydratedValues(loadResult.valuesByInstance, "remote-fallback");
    hasExistingDocument = loadResult.hasExistingDocument;
    if (!loadResult.errorMessage) {
      await savePageEditorDocumentToCache({
        pageId,
        valuesByInstance: loadResult.valuesByInstance,
        updatedAt: loadResult.updatedAt,
      });
    }

    isLoading = false;
    isBlockingLoad = false;
  }

  async function savePageEditorDocument(): Promise<void> {
    if (!currentUserId || isSaving || !isAuthenticated) {
      return;
    }

    isSaving = true;
    saveError = null;
    saveSuccess = null;

    const saveResult = await savePageEditorDocumentToDb({
      pageId,
      userId: currentUserId,
      valuesByInstance,
      hasExistingDocument,
    });

    if (saveResult.errorMessage) {
      saveError = saveResult.errorMessage;
      isSaving = false;
      return;
    }

    hasExistingDocument = true;
    await savePageEditorDocumentToCache({
      pageId,
      valuesByInstance,
      updatedAt: saveResult.updatedAt,
    });
    saveSuccess = "Saved";
    isSaving = false;
  }

  onMount(() => {
    void loadPageEditorDocument();
  });
</script>

<aside
  class="border-border bg-background flex min-h-0 shrink-0 flex-col overflow-hidden"
  aria-label="Page settings"
  style:width={width ? `${width}px` : undefined}
>
  <header
    class="border-border flex h-14 shrink-0 items-center gap-3 border-b px-3"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2">
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

      <span class="truncate text-sm font-medium">
        {pageId.length > 0 ? pageId : "Untitled page"}
      </span>

      {#if isBlockingLoad}
        <span class="text-muted-foreground text-xs">Loading...</span>
      {:else if isSaving}
        <span class="text-muted-foreground text-xs">Saving...</span>
      {:else if isSyncing}
        <span class="text-muted-foreground text-xs">Syncing...</span>
      {:else if saveSuccess}
        <span class="text-emerald-600 text-xs">{saveSuccess}</span>
      {/if}

      <Button
        size="sm"
        class="ml-auto h-7 bg-emerald-500 px-3 text-white hover:bg-emerald-600"
        onclick={savePageEditorDocument}
        disabled={!isAuthenticated || isBlockingLoad || isSaving}
      >
        Save
      </Button>
    </div>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto">
    <div class="space-y-5 p-4">
      {#if hasCheckedAuth && !isAuthenticated}
        <div
          class="text-muted-foreground rounded-md border border-dashed p-3 text-xs"
        >
          Sign in to load and save page editor content.
          <a href="/login" class="underline">Go to login</a>.
        </div>
      {/if}

      {#if loadError}
        <div class="text-destructive rounded-md border p-3 text-xs">
          Failed to load page content: {loadError}
        </div>
      {/if}

      {#if saveError}
        <div class="text-destructive rounded-md border p-3 text-xs">
          Failed to save page content: {saveError}
        </div>
      {/if}

      {#if isBlockingLoad}
        <div
          class="text-muted-foreground rounded-md border border-dashed p-4 text-xs"
        >
          Loading page editor content...
        </div>
      {:else if entries.length === 0}
        <div
          class="text-muted-foreground rounded-md border border-dashed p-4 text-xs"
        >
          No capsule entries found for this page yet.
        </div>
      {:else}
        {#each groupedEntries as group (group.capsuleKey)}
          {@const firstEntry = group.entries[0]?.entry}
          {@const capsule = getCapsuleByKey(group.capsuleKey)}
          {@const title = getCapsuleTitle(
            group.capsuleKey,
            firstEntry?.componentName ?? group.capsuleKey,
          )}
          {@const totalInstances = group.entries.reduce(
            (sum, item) => sum + item.entry.occurrenceCount,
            0,
          )}

          <section class="space-y-3 rounded-md border p-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-medium">{title}</h3>
                <Badge>{group.capsuleKey}</Badge>
              </div>
              <p class="text-muted-foreground text-xs">
                {totalInstances} instance{totalInstances === 1 ? "" : "s"}
              </p>
            </div>

            {#if !capsule}
              <p class="text-destructive text-xs">
                Capsule key "{group.capsuleKey}" is not registered. Schema
                renderer skipped for this group.
              </p>
            {:else}
              {@const flatInstances = group.entries.flatMap((entryItem) =>
                Array.from(
                  { length: entryItem.entry.occurrenceCount },
                  (_, occurrenceIndex) => ({
                    key: `${entryItem.entryIndex}-${occurrenceIndex}`,
                  }),
                ),
              )}
              <div class="space-y-4">
                {#each flatInstances as instance, instanceIndex (instance.key)}
                  {@const instanceId = `${group.capsuleKey}-${String(instanceIndex + 1).padStart(2, "0")}`}
                  <div class="space-y-2 rounded-md border p-2">
                    <div class="text-xs font-medium">{instanceId}</div>
                    {#key `${instanceId}-${schemaHydrationVersion}`}
                      <SchemaRenderer
                        schema={capsule.schema}
                        initialValues={valuesByInstance[instanceId]}
                        locales={LOCALES}
                        defaultLocale={DEFAULT_LOCALE}
                        editingLocale={locale}
                        translatableLocaleMode="active-only"
                        onValuesChange={(nextValues) =>
                          handleInstanceValuesChange(instanceId, nextValues)}
                      />
                    {/key}
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        {/each}
      {/if}
    </div>
  </div>
</aside>
