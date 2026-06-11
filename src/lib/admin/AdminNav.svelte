<script lang="ts">
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import GlobeIcon from "@lucide/svelte/icons/globe";
  import { onMount } from "svelte";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import LightSwitch from "$lib/components/LightSwitch.svelte";
  import type { ClassValue } from "clsx";
  import { cn } from "$lib/utils";

  type AdminRoute = "page-editor" | "globals";

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
  ];

  let pathname = $state("");

  function syncPathname() {
    if (typeof window === "undefined") return;
    pathname = window.location.pathname;
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
    syncPathname();
    document.addEventListener("astro:page-load", syncPathname);
    return () => document.removeEventListener("astro:page-load", syncPathname);
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
                  "focus-visible:ring-ring flex size-8 shrink-0 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none",
                  active
                    ? "bg-primary/30 text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon class="size-3.5" aria-hidden="true" />
                <span class="sr-only">{item.label}</span>
              </a>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="right">{item.label}</Tooltip.Content>
        </Tooltip.Root>
      {/each}
    </nav>

    <div class="mt-auto pb-2 flex items-center justify-center">
      <LightSwitch variant="ghost" class="size-8" />
    </div>
  </aside>
</Tooltip.Provider>
