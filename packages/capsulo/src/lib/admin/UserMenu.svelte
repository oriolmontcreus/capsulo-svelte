<script lang="ts">
  import UserRoundPenIcon from "@lucide/svelte/icons/user-round-pen";
  import LanguagesIcon from "@lucide/svelte/icons/languages";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import type { ClassValue } from "clsx";
  import { toggleMode } from "mode-watcher";
  import * as DropdownMenu from "../components/ui/dropdown-menu";
  import * as Tooltip from "../components/ui/tooltip";
  import UserAvatar from "../components/UserAvatar.svelte";
  import { UI_LOCALES, UI_LOCALE_NAMES, getUiLocale, isUiLocale, t } from "../admin-i18n/i18n.svelte";
  import { changeUiLocale, session, sessionDisplayName, signOut } from "../stores/session";
  import { cn } from "../utils";
  import AvatarDialog from "./AvatarDialog.svelte";

  const user = $derived($session?.user ?? null);
  const displayName = $derived(sessionDisplayName(user));

  let avatarDialogOpen = $state(false);

  /** Shared by every tile: a bordered square with the icon above its label. */
  const tileClass =
    "border-border cursor-pointer flex-col justify-center gap-1.5 rounded-md border px-1 py-3 text-center text-xs leading-tight";

  function selectLocale(value: string) {
    if (isUiLocale(value) && value !== getUiLocale()) void changeUiLocale(value);
  }

  async function handleSignOut() {
    await signOut();
    window.location.replace("/admin/login");
  }
</script>

<DropdownMenu.Root>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props: tooltipProps })}
        <DropdownMenu.Trigger {...tooltipProps}>
          {#snippet child({ props })}
            {@const { class: triggerClass, ...triggerProps } = props}
            <button
              type="button"
              {...triggerProps}
              class={cn(
                triggerClass as ClassValue,
                "focus-visible:ring-ring hover:ring-border data-[state=open]:ring-primary flex size-8 cursor-pointer shrink-0 items-center justify-center rounded-full ring-2 ring-transparent transition-shadow focus-visible:outline-none",
              )}
            >
              {#if user}
                <UserAvatar name={displayName} seed={user.id} avatar={user.avatar} avatarUrl={user.avatarUrl} size="lg" />
              {:else}
                <span class="bg-muted size-7 rounded-full" aria-hidden="true"></span>
              {/if}
              <span class="sr-only">{t("userMenu.label")}</span>
            </button>
          {/snippet}
        </DropdownMenu.Trigger>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content side="right">{displayName || t("userMenu.label")}</Tooltip.Content>
  </Tooltip.Root>

  <DropdownMenu.Content side="right" align="end" sideOffset={10} class="bg-background w-56 p-2">
    {#if user}
      <div class="flex items-center gap-2.5 px-1 pt-0.5 pb-2">
        <UserAvatar name={displayName} seed={user.id} avatar={user.avatar} avatarUrl={user.avatarUrl} size="lg" class="size-9" />
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">{displayName}</p>
          {#if user.name?.trim()}
            <p class="text-muted-foreground truncate text-xs">{user.login}</p>
          {/if}
        </div>
      </div>
      <DropdownMenu.Separator class="-mx-2 mb-2" />
    {/if}

    <div class="grid grid-cols-2 gap-1.5">
      <DropdownMenu.Item class={tileClass} disabled={!user} onSelect={() => (avatarDialogOpen = true)}>
        <UserRoundPenIcon class="size-4" aria-hidden="true" />
        {t("userMenu.avatar")}
      </DropdownMenu.Item>

      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger
          class={cn(
            tileClass,
            "relative [&>svg:last-child]:absolute [&>svg:last-child]:top-1.5 [&>svg:last-child]:right-1.5 [&>svg:last-child]:size-3 [&>svg:last-child]:opacity-50",
          )}
        >
          <LanguagesIcon class="size-4" aria-hidden="true" />
          <span>
            {t("userMenu.language")}
            <span class="text-muted-foreground block text-[10px]">{UI_LOCALE_NAMES[getUiLocale()]}</span>
          </span>
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent class="bg-background w-40">
          <DropdownMenu.RadioGroup value={getUiLocale()} onValueChange={selectLocale}>
            {#each UI_LOCALES as locale (locale)}
              <DropdownMenu.RadioItem value={locale} lang={locale} class="cursor-pointer">
                {UI_LOCALE_NAMES[locale]}
              </DropdownMenu.RadioItem>
            {/each}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>

      <!-- Names the theme it switches to; dark: classes so it is right before hydration too. -->
      <DropdownMenu.Item class={tileClass} closeOnSelect={false} onSelect={toggleMode}>
        <MoonIcon class="size-4 dark:hidden" aria-hidden="true" />
        <SunIcon class="hidden size-4 dark:block" aria-hidden="true" />
        <span class="dark:hidden">{t("userMenu.darkMode")}</span>
        <span class="hidden dark:inline">{t("userMenu.lightMode")}</span>
      </DropdownMenu.Item>

      <DropdownMenu.Item class={tileClass} onSelect={handleSignOut}>
        <LogOutIcon class="size-4" aria-hidden="true" />
        {t("nav.signOut")}
      </DropdownMenu.Item>
    </div>
  </DropdownMenu.Content>
</DropdownMenu.Root>

{#if user}
  <AvatarDialog bind:open={avatarDialogOpen} {user} />
{/if}
