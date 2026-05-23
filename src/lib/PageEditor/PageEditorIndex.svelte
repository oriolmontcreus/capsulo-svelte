<script lang="ts">
  import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage,
  } from "$lib/components/ui/breadcrumb";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import FolderIcon from "@lucide/svelte/icons/folder";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import LightSwitch from "$lib/components/LightSwitch.svelte";
  import { onMount } from "svelte";

  interface PageCard {
    pageId: string;
    capsuleCount: number;
    instanceCount: number;
    href: string;
  }

  let { pageCards }: { pageCards: PageCard[] } = $props();

  let currentPath = $state<string[]>([]);

  const prefix = $derived(
    currentPath.length > 0 ? currentPath.join("/") + "/" : "",
  );

  interface FolderInfo {
    name: string;
    itemCount: number;
  }

  interface PageInfo {
    pageId: string;
    name: string;
    capsuleCount: number;
    instanceCount: number;
    href: string;
  }

  const folders = $derived.by((): FolderInfo[] => {
    const folderCounts = new Map<string, number>();

    for (const card of pageCards) {
      if (!card.pageId.startsWith(prefix)) continue;
      const remaining = card.pageId.slice(prefix.length);
      const slashIndex = remaining.indexOf("/");
      if (slashIndex === -1) continue;
      const folderName = remaining.slice(0, slashIndex);
      folderCounts.set(folderName, (folderCounts.get(folderName) ?? 0) + 1);
    }

    return Array.from(folderCounts.entries())
      .map(([name, itemCount]) => ({ name, itemCount }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  const pages = $derived.by((): PageInfo[] => {
    const result: PageInfo[] = [];
    for (const card of pageCards) {
      if (!card.pageId.startsWith(prefix)) continue;
      const remaining = card.pageId.slice(prefix.length);
      if (remaining.includes("/")) continue;
      result.push({
        pageId: card.pageId,
        name: remaining,
        capsuleCount: card.capsuleCount,
        instanceCount: card.instanceCount,
        href: card.href,
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  });

  const totalItems = $derived(folders.length + pages.length);

  function enterFolder(folderName: string) {
    currentPath = [...currentPath, folderName];
  }

  function navigateToRoot() {
    currentPath = [];
  }

  function navigateToBreadcrumbIndex(index: number) {
    currentPath = currentPath.slice(0, index);
  }

  function displayName(name: string): string {
    return name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function formatFolderDisplayName(name: string): string {
    return displayName(name);
  }

  onMount(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const pathParam = params.get("path");

    if (pathParam) {
      currentPath = pathParam.split("/").filter(Boolean);
      history.replaceState({}, "", window.location.pathname);
    }
  });
</script>

<div class="relative flex flex-col gap-6">
  <div class="absolute right-4 top-4 z-20">
    <LightSwitch />
  </div>
  <!-- Header + Breadcrumb -->
  <div class="flex flex-col gap-2 mt-20">
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-normal tracking-tight">Page Editor</h1>
      <p class="text-foreground-muted text-sm">
        Select a page or folder to edit capsule schemas.
      </p>
    </div>

    {#if currentPath.length > 0}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              onclick={(e) => {
                e.preventDefault();
                navigateToRoot();
              }}
              href="#"
            >
              Pages
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>

          {#each currentPath as segment, i}
            {#if i < currentPath.length - 1}
              <BreadcrumbItem>
                <BreadcrumbLink
                  onclick={(e) => {
                    e.preventDefault();
                    navigateToBreadcrumbIndex(i + 1);
                  }}
                  href="#"
                >
                  {displayName(segment)}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
            {:else}
              <BreadcrumbItem>
                <BreadcrumbPage>{displayName(segment)}</BreadcrumbPage>
              </BreadcrumbItem>
            {/if}
          {/each}
        </BreadcrumbList>
      </Breadcrumb>
    {/if}
  </div>

  <!-- Content -->
  {#if totalItems === 0}
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">No detected pages</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-foreground-muted text-sm">
          The capsule manifest is empty. Add capsule usage in a public page and
          refresh.
        </p>
      </CardContent>
    </Card>
  {:else}
    <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <!-- Folders -->
      {#each folders as folder}
        <button
          type="button"
          onclick={() => enterFolder(folder.name)}
          class="group border-border bg-background hover:bg-primary/10 focus-visible:ring-ring cursor-pointer rounded-xl border p-6 shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none text-left"
        >
          <div class="flex flex-col gap-4">
            <div
              class="bg-accent/10 text-accent flex size-12 items-center justify-center rounded-lg"
            >
              <FolderIcon class="size-6" />
            </div>
            <div class="flex flex-col gap-1.5">
              <p class="text-base font-normal">
                {formatFolderDisplayName(folder.name)}
              </p>
              <p class="text-foreground-muted text-sm">
                {folder.itemCount}
                {folder.itemCount === 1 ? "page" : "pages"}
              </p>
            </div>
          </div>
        </button>
      {/each}

      <!-- Pages -->
      {#each pages as page}
        <a
          href={page.href}
          data-page-editor-link
          data-page-id={page.pageId}
          data-astro-prefetch="hover"
          class="group border-border bg-background hover:bg-muted/40 focus-visible:ring-ring flex cursor-pointer flex-col gap-4 rounded-xl border p-6 shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <div
            class="bg-background-muted text-foreground-muted flex size-12 items-center justify-center rounded-lg"
          >
            <FileTextIcon class="size-6" />
          </div>
          <div class="flex flex-col gap-1.5">
            <p class="font-mono text-sm">{page.name}</p>
            <div class="text-foreground-muted flex items-center gap-3 text-xs">
              <span>{page.capsuleCount} capsules</span>
              <span>{page.instanceCount} instances</span>
            </div>
          </div>
        </a>
      {/each}
    </section>
  {/if}
</div>
