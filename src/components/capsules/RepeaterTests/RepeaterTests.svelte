<script lang="ts">
  import { getCmsData } from "$lib/cms/get-cms-data";
  import { cmsStore } from "$lib/cms/cms-store.svelte";
  import * as Card from "$lib/components/ui/card";
  import { mediaUrl } from "$lib/form-builder/fields/FileUploadField/storage";

  import { repeaterTestsSchema } from "./repeater-tests.schema";
  import type { RepeaterTestsData } from "./repeater-tests.schema.d";

  interface Props {
    instanceId: string;
  }

  let { instanceId }: Props = $props();

  const data = $derived(
    getCmsData<RepeaterTestsData & Record<string, unknown>>(instanceId, repeaterTestsSchema),
  );

  // The editor preview reads new uploads through the Worker; the live site uses the build's copies.
  const mediaSource = $derived(cmsStore.active ? "live" : "published");

  const buttonClass: Record<string, string> = {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    ghost: "hover:bg-muted",
  };
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight">{data.heading}</h1>
    <p class="text-muted-foreground text-sm">
      Live preview of Repeater configurations. Edit the items in the admin page editor.
    </p>
    <p class="text-muted-foreground font-mono text-xs">instance: {instanceId}</p>
  </header>

  <section class="space-y-3">
    <h2 class="text-lg font-semibold">Cards ({data.cards.length})</h2>
    {#if data.cards.length > 0}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.cards as card (card._id)}
          <Card.Root class="pt-0">
            {#if card.image?.[0]}
              <img src={mediaUrl(card.image[0], mediaSource)} alt="" class="aspect-video w-full object-cover" />
            {:else}
              <div class="bg-muted aspect-video w-full"></div>
            {/if}
            <Card.Header>
              <Card.Title>{card.title || "Untitled card"}</Card.Title>
              {#if card.body}
                <Card.Description class="whitespace-pre-line">{card.body}</Card.Description>
              {/if}
            </Card.Header>
          </Card.Root>
        {/each}
      </div>
    {:else}
      <p class="text-muted-foreground text-sm italic">No cards yet.</p>
    {/if}
  </section>

  <section class="space-y-3">
    <h2 class="text-lg font-semibold">Stats</h2>
    <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {#each data.stats as stat (stat._id)}
        <div class="rounded-lg border p-4">
          <dt class="text-muted-foreground text-xs">{stat.label}</dt>
          <dd class="text-2xl font-semibold tabular-nums">{stat.value}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <section class="space-y-3">
    <h2 class="text-lg font-semibold">FAQ</h2>
    {#each data.faq as section (section._id)}
      <div class="space-y-2">
        <h3 class="font-medium">{section.section || "Untitled section"}</h3>
        {#each section.questions as entry (entry._id)}
          <details class="rounded-md border px-3 py-2">
            <summary class="cursor-pointer text-sm font-medium">{entry.question || "Untitled question"}</summary>
            <!-- Rich editor content authored in the CMS. -->
            <div class="prose prose-sm dark:prose-invert mt-2 max-w-none">{@html entry.answer ?? ""}</div>
          </details>
        {:else}
          <p class="text-muted-foreground text-sm italic">No questions in this section.</p>
        {/each}
      </div>
    {:else}
      <p class="text-muted-foreground text-sm italic">No FAQ sections yet.</p>
    {/each}
  </section>

  <section class="space-y-3">
    <h2 class="text-lg font-semibold">Buttons</h2>
    <div class="flex flex-wrap gap-2">
      {#each data.buttons as button (button._id)}
        <a
          href={button.href || "#"}
          target={button.external ? "_blank" : undefined}
          rel={button.external ? "noopener noreferrer" : undefined}
          class="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium {buttonClass[button.variant ?? 'primary'] ?? ''}"
          style={button.accent ? `border-color: ${button.accent};` : undefined}
        >
          {button.label || "Button"}
        </a>
      {:else}
        <p class="text-muted-foreground text-sm italic">No buttons yet.</p>
      {/each}
    </div>
  </section>
</div>
