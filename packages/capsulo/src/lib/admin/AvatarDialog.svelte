<script lang="ts">
  import DicesIcon from "@lucide/svelte/icons/dices";
  import Undo2Icon from "@lucide/svelte/icons/undo-2";
  import CheckIcon from "@lucide/svelte/icons/check";
  import { untrack } from "svelte";
  import * as Dialog from "../components/ui/dialog";
  import { Button } from "../components/ui/button";
  import UserAvatar from "../components/UserAvatar.svelte";
  import { AVATAR_BACKGROUNDS, randomAvatarSeed, type AvatarConfig } from "../avatar/avatar-config";
  import { defaultAvatarBackground } from "../avatar/avatar-render";
  import { t } from "../admin-i18n/i18n.svelte";
  import { changeAvatar, type SessionUser } from "../stores/session";
  import { cn } from "../utils";

  let { open = $bindable(false), user }: { open?: boolean; user: SessionUser } = $props();

  let seed = $state("");
  let background = $state<string>(AVATAR_BACKGROUNDS[0]);
  /** Faces shuffled past, so "Previous" can bring back one the editor liked. */
  let previousSeeds = $state<string[]>([]);
  let saving = $state(false);
  let error = $state<string | null>(null);

  // Every opening starts from the saved avatar (or the default one), not from the last edit.
  $effect.pre(() => {
    if (!open) return;
    untrack(() => {
      seed = user.avatar?.seed ?? user.id;
      background = user.avatar?.background ?? defaultAvatarBackground(user.id);
      previousSeeds = [];
      error = null;
    });
  });

  const preview = $derived<AvatarConfig>({ seed, background });

  function shuffle() {
    previousSeeds = [...previousSeeds.slice(-19), seed];
    seed = randomAvatarSeed();
  }

  function goBack() {
    const last = previousSeeds.at(-1);
    if (!last) return;
    seed = last;
    previousSeeds = previousSeeds.slice(0, -1);
  }

  async function save(avatar: AvatarConfig | null) {
    saving = true;
    error = null;
    const failure = await changeAvatar(avatar);
    saving = false;
    if (failure) error = t("avatarDialog.saveFailed", { error: failure });
    else open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-sm">
    <Dialog.Header>
      <Dialog.Title>{t("avatarDialog.title")}</Dialog.Title>
      <Dialog.Description>{t("avatarDialog.description")}</Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col items-center gap-4">
      <UserAvatar name={user.name ?? user.login} avatar={preview} size="xl" />

      <!-- Side columns keep Shuffle centred (and in place) when Previous appears. -->
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div class="flex justify-end">
          {#if previousSeeds.length > 0}
            <Button variant="ghost" size="icon" onclick={goBack}>
              <Undo2Icon aria-hidden="true" />
              <span class="sr-only">{t("avatarDialog.back")}</span>
            </Button>
          {/if}
        </div>
        <Button variant="outline" onclick={shuffle}>
          <DicesIcon aria-hidden="true" />
          {t("avatarDialog.shuffle")}
        </Button>
      </div>

      <div role="radiogroup" aria-label={t("avatarDialog.color")} class="flex flex-wrap justify-center gap-2">
        {#each AVATAR_BACKGROUNDS as color, index (color)}
          {@const selected = color === background}
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t("avatarDialog.colorOption", { index: index + 1 })}
            onclick={() => (background = color)}
            class={cn(
              "focus-visible:ring-ring ring-offset-background flex size-7 cursor-pointer items-center justify-center rounded-full ring-offset-2 transition-shadow focus-visible:ring-2 focus-visible:outline-none",
              selected ? "ring-foreground ring-2" : "hover:ring-border hover:ring-2",
            )}
            style:background-color="#{color}"
          >
            {#if selected}
              <CheckIcon class="size-3.5 text-black/70" aria-hidden="true" />
            {/if}
          </button>
        {/each}
      </div>
    </div>

    {#if error}
      <p class="text-destructive text-center text-sm" role="alert">{error}</p>
    {/if}

    <Dialog.Footer class="sm:justify-between">
      {#if user.avatar}
        <Button variant="ghost" disabled={saving} onclick={() => save(null)}>{t("avatarDialog.useDefault")}</Button>
      {:else}
        <span></span>
      {/if}
      <div class="flex gap-2">
        <Button variant="outline" disabled={saving} onclick={() => (open = false)}>{t("avatarDialog.cancel")}</Button>
        <Button disabled={saving} onclick={() => save(preview)}>
          {saving ? t("avatarDialog.saving") : t("avatarDialog.save")}
        </Button>
      </div>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
