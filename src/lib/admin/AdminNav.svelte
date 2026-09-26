<script lang="ts">
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import GlobeIcon from "@lucide/svelte/icons/globe";
  import GitCompareArrowsIcon from "@lucide/svelte/icons/git-compare-arrows";
  import HistoryIcon from "@lucide/svelte/icons/history";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import SparklesIcon from "@lucide/svelte/icons/sparkles";
  import { onMount } from "svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import LightSwitch from "$lib/components/LightSwitch.svelte";
  import type { ClassValue } from "clsx";
  import { cn } from "$lib/utils";
  import { listChangedPages } from "$lib/PageEditor/changes/changed-pages";
  import { CHANGES_UPDATED_EVENT } from "$lib/PageEditor/changes/draft-write";
  import { signOut } from "$lib/stores/session";
  import { AI_ENABLED } from "$lib/ai/config";
  import { aiSidebar, toggleAiSidebar } from "$lib/ai/ai-sidebar-state.svelte";

  type AdminRoute = "page-editor" | "globals" | "changes" | "history";

  type NavItem = {
    id: AdminRoute;
    href: string;
    label: string;
    icon: typeof FileTextIcon;
    matchPrefix: string;
  };

  let { activeRoute }: { activeRoute: AdminRoute } = $props();

  const navItems: NavItem[] = [
    {
      id: "page-editor",
      href: "/admin/page-editor",
      label: "Page Editor",
      icon: FileTextIcon,
      matchPrefix: "/admin/page-editor",
    },
    {
      id: "globals",
      href: "/admin/globals",
      label: "Global Variables",
      icon: GlobeIcon,
      matchPrefix: "/admin/globals",
    },
    {
      id: "changes",
      href: "/admin/changes",
      label: "Changes",
      icon: GitCompareArrowsIcon,
      matchPrefix: "/admin/changes",
    },
    {
      id: "history",
      href: "/admin/history",
      label: "History",
      icon: HistoryIcon,
      matchPrefix: "/admin/history",
    },
  ];

  const aiShortcutLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘." : "Ctrl+.";

  let pathname = $state("");
  let changedCount = $state(0);
  let hydrated = $state(false);

  function syncPathname() {
    if (typeof window === "undefined") return;
    pathname = window.location.pathname;
  }

  async function syncChangedCount() {
    changedCount = (await listChangedPages()).length;
  }

  function isActive(item: NavItem): boolean {
    if (pathname) {
      return (
        pathname === item.matchPrefix ||
        pathname.startsWith(`${item.matchPrefix}/`)
      );
    }
    return activeRoute === item.id;
  }

  async function handleSignOut() {
    await signOut();
    window.location.replace("/admin/login");
  }

  onMount(() => {
    hydrated = true;
    syncPathname();
    void syncChangedCount();
    const onPageLoad = () => {
      syncPathname();
      void syncChangedCount();
    };
    const onChangesUpdated = () => void syncChangedCount();
    document.addEventListener("astro:page-load", onPageLoad);
    window.addEventListener(CHANGES_UPDATED_EVENT, onChangesUpdated);
    return () => {
      document.removeEventListener("astro:page-load", onPageLoad);
      window.removeEventListener(CHANGES_UPDATED_EVENT, onChangesUpdated);
    };
  });
</script>

<Tooltip.Provider delayDuration={150}>
  <aside
    class="border-border bg-background flex h-full w-11 shrink-0 flex-col border-r"
    aria-label="Admin navigation"
  >
    <nav class="flex flex-col items-center gap-2 py-2">
      {#each navItems as item (item.id)}
        {@const Icon = item.icon}
        {@const active = isActive(item)}
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              {@const { class: triggerClass, ...triggerProps } = props}
              <a
                href={item.href}
                {...triggerProps}
                aria-current={active ? "page" : undefined}
                class={cn(
                  triggerClass as ClassValue,
                  "focus-visible:ring-ring relative flex size-8 shrink-0 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none",
                  active
                    ? "bg-primary/30 text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon class="size-3.5" aria-hidden="true" />
                <span class="sr-only">{item.label}</span>
                {#if item.id === "changes" && changedCount > 0}
                  <span
                    class="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] leading-none font-medium tabular-nums"
                    aria-label="{changedCount} pages with changes"
                  >
                    {changedCount}
                  </span>
                {/if}
              </a>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{item.label}</Tooltip.Content>
        </Tooltip.Root>
      {/each}
    </nav>

    <div class="mt-auto pb-2 flex flex-col items-center justify-center gap-2">
      {#if AI_ENABLED}
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              {@const { class: triggerClass, ...triggerProps } = props}
              <button
                type="button"
                {...triggerProps}
                onclick={toggleAiSidebar}
                aria-pressed={aiSidebar.open}
                class={cn(
                  triggerClass as ClassValue,
                  "focus-visible:ring-ring flex size-8 shrink-0 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none",
                  !hydrated
                    ? // Before hydration, follow <html data-ai-sidebar> like the panel does.
                      "text-muted-foreground in-data-[ai-sidebar=open]:bg-primary/30 in-data-[ai-sidebar=open]:text-foreground"
                    : aiSidebar.open
                      ? "bg-primary/30 text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <SparklesIcon class="size-3.5" aria-hidden="true" />
                <span class="sr-only">AI agent</span>
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">AI agent ({aiShortcutLabel})</Tooltip.Content>
        </Tooltip.Root>
      {/if}
      <LightSwitch variant="ghost" class="size-8" />
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            {@const { class: triggerClass, ...triggerProps } = props}
            <button
              type="button"
              {...triggerProps}
              onclick={handleSignOut}
              class={cn(
                triggerClass as ClassValue,
                "text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring flex size-8 shrink-0 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none",
              )}
            >
              <LogOutIcon class="size-3.5" aria-hidden="true" />
              <span class="sr-only">Sign out</span>
            </button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="right">Sign out</Tooltip.Content>
      </Tooltip.Root>
    </div>
  </aside>
</Tooltip.Provider>
