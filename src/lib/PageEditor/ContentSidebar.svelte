<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { getCapsuleByKey } from "$lib/capsules/core/registry";
  import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
  import SchemaRenderer from "$lib/form-builder/renderer/SchemaRenderer.svelte";
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
    locale = $bindable<string>(DEFAULT_LOCALE),
    width,
  } = $props<Props>();

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

  let valuesByInstance = $state<Record<string, SchemaValues>>({});

  function handleInstanceValuesChange(instanceId: string, nextValues: SchemaValues) {
    const nextValuesByInstance = {
      ...valuesByInstance,
      [instanceId]: nextValues,
    };
    valuesByInstance = nextValuesByInstance;

    console.log("[PageEditor] Final JSON", JSON.stringify(nextValuesByInstance, null, 2));
  }

  function getCapsuleTitle(capsuleKey: string, componentName: string): string {
    const capsule = getCapsuleByKey(capsuleKey);
    return capsule?.meta?.displayName ?? componentName ?? capsuleKey;
  }
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

      <Button
        size="sm"
        class="ml-auto h-7 bg-emerald-500 px-3 text-white hover:bg-emerald-600"
      >
        Publish
      </Button>
    </div>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto">
    <div class="space-y-5 p-4">
      {#if entries.length === 0}
        <div class="text-muted-foreground rounded-md border border-dashed p-4 text-xs">
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
                    <SchemaRenderer
                      schema={capsule.schema}
                      locales={LOCALES}
                      defaultLocale={DEFAULT_LOCALE}
                      editingLocale={locale}
                      translatableLocaleMode="active-only"
                      onValuesChange={(nextValues) =>
                        handleInstanceValuesChange(instanceId, nextValues)}
                    />
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
