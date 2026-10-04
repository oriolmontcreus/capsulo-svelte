<script lang="ts">
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import GlobeIcon from "@lucide/svelte/icons/globe";
  import GitCompareArrowsIcon from "@lucide/svelte/icons/git-compare-arrows";
  import HistoryIcon from "@lucide/svelte/icons/history";
  import SparklesIcon from "@lucide/svelte/icons/sparkles";
  import { onMount } from "svelte";
  import * as Tooltip from "../components/ui/tooltip";
  import type { ClassValue } from "clsx";
  import { cn } from "../utils";
  import { listChangedPages } from "../PageEditor/changes/changed-pages";
  import { onChangesUpdated } from "../PageEditor/page-editor-cache";
  import { ensureSession } from "../stores/session";
  import { AI_ENABLED } from "../ai/config";
  import { aiSidebar, toggleAiSidebar } from "../ai/ai-sidebar-state.svelte";
  import { t, type MessageKey } from "../admin-i18n/i18n.svelte";
  import UserMenu from "./UserMenu.svelte";
  import { ADMIN_PORTAL_HOST } from "./portal-host";
  import { BitsConfig } from "bits-ui";

  type AdminRoute = "page-editor" | "globals" | "changes" | "history";

  type NavItem = {
    id: AdminRoute;
    href: string;
    labelKey: MessageKey;
    icon: typeof FileTextIcon;
    matchPrefix: string;
  };

  let { activeRoute }: { activeRoute: AdminRoute } = $props();

  const navItems: NavItem[] = [
    {
      id: "page-editor",
      href: "/admin/page-editor",
      labelKey: "nav.pageEditor",
      icon: FileTextIcon,
      matchPrefix: "/admin/page-editor",
    },
    {
      id: "globals",
      href: "/admin/globals",
      labelKey: "nav.globals",
      icon: GlobeIcon,
      matchPrefix: "/admin/globals",
    },
    {
      id: "changes",
      href: "/admin/changes",
      labelKey: "nav.changes",
      icon: GitCompareArrowsIcon,
      matchPrefix: "/admin/changes",
    },
    {
      id: "history",
      href: "/admin/history",
      labelKey: "nav.history",
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

  let latestCountRunId = 0;

  async function syncChangedCount() {
    // Writes can land back to back (a commit saves every page): only the newest read counts.
    const runId = ++latestCountRunId;
    const count = (await listChangedPages()).length;
    if (runId === latestCountRunId) changedCount = count;
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

  onMount(() => {
    hydrated = true;
    void ensureSession();
    syncPathname();
    void syncChangedCount();
    const onPageLoad = () => {
      syncPathname();
      void syncChangedCount();
    };
    document.addEventListener("astro:page-load", onPageLoad);
    const stopChangesListener = onChangesUpdated(() => void syncChangedCount());
    return () => {
      document.removeEventListener("astro:page-load", onPageLoad);
      stopChangesListener();
    };
  });
</script>

<!-- The nav persists across navigations: its menus and tooltips must too. -->
<BitsConfig defaultPortalTo={ADMIN_PORTAL_HOST}>
<Tooltip.Provider delayDuration={150}>
  <aside
    class="border-border bg-background flex h-full w-11 shrink-0 flex-col border-r"
    aria-label={t("nav.label")}
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
                <span class="sr-only">{t(item.labelKey)}</span>
                {#if item.id === "changes" && changedCount > 0}
                  <span
                    class="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] leading-none font-medium tabular-nums"
                    aria-label={t("nav.pagesWithChanges", { count: changedCount })}
                  >
                    {changedCount}
                  </span>
                {/if}
              </a>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{t(item.labelKey)}</Tooltip.Content>
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
                <span class="sr-only">{t("nav.aiAgent")}</span>
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{t("nav.aiAgentShortcut", { shortcut: aiShortcutLabel })}</Tooltip.Content>
        </Tooltip.Root>
      {/if}
      <UserMenu />
    </div>
  </aside>
</Tooltip.Provider>
</BitsConfig>
