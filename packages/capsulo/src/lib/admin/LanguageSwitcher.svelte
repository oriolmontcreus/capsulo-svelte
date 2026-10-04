<script lang="ts">
  import LanguagesIcon from "@lucide/svelte/icons/languages";
  import type { ClassValue } from "clsx";
  import * as DropdownMenu from "../components/ui/dropdown-menu";
  import * as Tooltip from "../components/ui/tooltip";
  import { Button, type ButtonVariant } from "../components/ui/button";
  import {
    UI_LOCALES,
    UI_LOCALE_NAMES,
    getUiLocale,
    isUiLocale,
    setUiLocale,
    t,
  } from "../admin-i18n/i18n.svelte";
  import { changeUiLocale } from "../stores/session";
  import { cn } from "../utils";

  let {
    variant = "outline",
    side = "bottom",
    saveToAccount = true,
    class: className,
  }: {
    variant?: ButtonVariant;
    side?: "right" | "bottom";
    /** Signed in: also save the choice on the editor's account (other devices follow it). */
    saveToAccount?: boolean;
    class?: ClassValue;
  } = $props();

  function select(value: string) {
    if (!isUiLocale(value) || value === getUiLocale()) return;
    if (saveToAccount) void changeUiLocale(value);
    else setUiLocale(value);
  }
</script>

<Tooltip.Provider delayDuration={150}>
  <DropdownMenu.Root>
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props: tooltipProps })}
          <DropdownMenu.Trigger {...tooltipProps}>
            {#snippet child({ props })}
              {@const { class: triggerClass, ...triggerProps } = props}
              <Button
                {...triggerProps}
                {variant}
                size="icon"
                class={cn(triggerClass as ClassValue, className)}
              >
                <LanguagesIcon class="size-3.5" aria-hidden="true" />
                <span class="sr-only">{t("nav.language")}</span>
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content {side}>{t("nav.language")}</Tooltip.Content>
    </Tooltip.Root>
    <DropdownMenu.Content {side} align="end" class="w-40">
      <DropdownMenu.Label class="text-muted-foreground text-xs font-normal">
        {t("nav.language")}
      </DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={getUiLocale()} onValueChange={select}>
        {#each UI_LOCALES as locale (locale)}
          <DropdownMenu.RadioItem value={locale} lang={locale}>
            {UI_LOCALE_NAMES[locale]}
          </DropdownMenu.RadioItem>
        {/each}
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</Tooltip.Provider>
