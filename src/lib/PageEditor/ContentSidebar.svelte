<script lang="ts">
  import { get } from "svelte/store";
  import { onMount } from "svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import MoreHorizontalIcon from "@lucide/svelte/icons/more-horizontal";
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

  export type PageEditorSaveControls = {
    save: () => Promise<void>;
    disabled: boolean;
    isSaving: boolean;
  };

  type Props = {
    pageId: string;
    entries: CapsuleManifestEntry[];
    locale: string;
    valuesByInstance: PageEditorValuesByInstance;
    width?: number;
    saveControls: PageEditorSaveControls;
  };

  let {
    pageId,
    entries,
    locale = $bindable(DEFAULT_LOCALE),
    valuesByInstance = $bindable({} as PageEditorValuesByInstance),
    width,
    saveControls = $bindable({
      save: async () => {},
      disabled: true,
      isSaving: false,
    }),
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
  let latestLoadRunId = 0;
  let schemaHydrationVersion = $state(0);
  let collapsedCapsuleKeys = $state(new Set<string>());
  const cachePersistDebounceMs = 250;

  function isCapsuleExpanded(capsuleKey: string): boolean {
    return !collapsedCapsuleKeys.has(capsuleKey);
  }

  function toggleCapsuleExpanded(capsuleKey: string): void {
    const next = new Set(collapsedCapsuleKeys);
    if (next.has(capsuleKey)) {
      next.delete(capsuleKey);
    } else {
      next.add(capsuleKey);
    }
    collapsedCapsuleKeys = next;
  }

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

    const saveResult = await savePageEditorDocumentToDb({
      pageId,
      userId: currentUserId,
      valuesByInstance,
      hasExistingDocument,
    });

    if (saveResult.errorMessage) {
      saveError = saveResult.errorMessage;
      isSaving = false;
      syncSaveControls();
      return;
    }

    hasExistingDocument = true;
    await savePageEditorDocumentToCache({
      pageId,
      valuesByInstance,
      updatedAt: saveResult.updatedAt,
    });
    isSaving = false;
    syncSaveControls();
  }

  function syncSaveControls(): void {
    saveControls = {
      save: savePageEditorDocument,
      disabled: !isAuthenticated || isBlockingLoad || isSaving,
      isSaving,
    };
  }

  onMount(() => {
    syncSaveControls();
    void loadPageEditorDocument();
  });

  $effect(() => {
    isAuthenticated;
    isBlockingLoad;
    isSaving;
    syncSaveControls();
  });

  $effect(() => {
    if (!pageId || isLoading) return;
    valuesByInstance;

    const timeoutId = window.setTimeout(() => {
      void savePageEditorDocumentToCache({
        pageId,
        valuesByInstance,
        updatedAt: null,
      });
    }, cachePersistDebounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  });
</script>

<aside
  class="border-border bg-background flex min-h-0 shrink-0 flex-col overflow-hidden"
  aria-label="Page settings"
  style:width={width ? `${width}px` : undefined}
>
  <div class="min-h-0 flex-1 overflow-y-auto">
    <div class="space-y-4 p-4">
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
          {@const flatInstanceKeys = group.entries.flatMap((entryItem) =>
            Array.from(
              { length: entryItem.entry.occurrenceCount },
              (_, occurrenceIndex) =>
                `${entryItem.entryIndex}-${occurrenceIndex}`,
            ),
          )}
          {@const instanceIds = flatInstanceKeys.map(
            (_, instanceIndex) =>
              `${group.capsuleKey}-${String(instanceIndex + 1).padStart(2, "0")}`,
          )}

          {@const isExpanded = isCapsuleExpanded(group.capsuleKey)}
          {@const panelId = `capsule-panel-${group.capsuleKey}`}

          <section class="border-border overflow-hidden rounded-md border">
            <div class="hover:bg-muted/50 flex w-full items-stretch">
              <button
                type="button"
                class="flex min-w-0 flex-1 cursor-pointer items-center gap-1 bg-transparent px-2 py-1.5 text-left hover:bg-transparent"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onclick={() => toggleCapsuleExpanded(group.capsuleKey)}
              >
                <ChevronRightIcon
                  class="text-muted-foreground size-3.5 shrink-0 {isExpanded
                    ? 'rotate-90'
                    : ''}"
                  aria-hidden="true"
                />
                <span class="truncate text-sm font-medium">{title}</span>
              </button>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props })}
                    <button
                      type="button"
                      {...props}
                      class="text-muted-foreground hover:bg-transparent focus-visible:ring-ring inline-flex shrink-0 cursor-pointer items-center bg-transparent px-2 py-1.5 outline-none focus-visible:ring-2"
                      aria-label={`Capsule info: key ${group.capsuleKey}, ${instanceIds.length} instance${instanceIds.length === 1 ? "" : "s"}`}
                    >
                      <MoreHorizontalIcon class="size-3.5" aria-hidden="true" />
                    </button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" class="flex flex-col gap-2 py-2">
                  <div class="flex flex-col gap-0.5">
                    <span class="text-background/60">Key</span>
                    <span class="font-mono">{group.capsuleKey}</span>
                  </div>
                  <div class="flex flex-col gap-0.5">
                    <span class="text-background/60">Instances</span>
                    <span>
                      {instanceIds.length} instance{instanceIds.length === 1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                  {#if instanceIds.length > 0}
                    <ul class="flex flex-col gap-0.5 font-mono">
                      {#each instanceIds as instanceId (instanceId)}
                        <li>{instanceId}</li>
                      {/each}
                    </ul>
                  {/if}
                </Tooltip.Content>
              </Tooltip.Root>
            </div>

            {#if isExpanded}
              <div id={panelId}>
                {#if !capsule}
                  <p class="text-destructive px-3 py-2.5 text-xs">
                    Capsule key "{group.capsuleKey}" is not registered. Schema
                    renderer skipped for this group.
                  </p>
                {:else}
                  {#each flatInstanceKeys as instanceKey, instanceIndex (instanceKey)}
                    {@const instanceId = instanceIds[instanceIndex]}
                    {#if instanceIndex > 0}
                      <div
                        class="border-border border-t"
                        role="separator"
                        aria-hidden="true"
                      ></div>
                    {/if}
                    <div class="px-3 py-3">
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
                {/if}
              </div>
            {/if}
          </section>
        {/each}
      {/if}
    </div>
  </div>
</aside>
