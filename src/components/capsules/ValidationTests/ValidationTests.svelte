<script lang="ts">
  import { getCmsData } from "capsulo/runtime";

  import { validationTestsSchema } from "./validation-tests.schema";
  import type { ValidationTestsData } from "./validation-tests.schema.d";

  interface Props {
    instanceId: string;
  }

  let { instanceId }: Props = $props();

  const data = $derived(
    getCmsData<ValidationTestsData & Record<string, unknown>>(instanceId, validationTestsSchema),
  );

  const priceLabel = $derived(
    typeof data.price === "number"
      ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(data.price)
      : "—",
  );
</script>

<div class="mx-auto max-w-3xl space-y-6 p-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight">{data.title}</h1>
    <p class="text-muted-foreground text-sm">
      Conditional fields and validation. Edit this page in the admin page editor.
    </p>
    <p class="text-muted-foreground font-mono text-xs">instance: {instanceId}</p>
  </header>

  {#if data.showCta && data.ctaLabel}
    <a class="bg-primary text-primary-foreground inline-flex rounded-md px-4 py-2 text-sm font-medium" href={data.ctaUrl || "#"}>
      {data.ctaLabel}
    </a>
  {/if}

  <dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
    <dt class="text-muted-foreground">Price</dt>
    <dd>{priceLabel}</dd>
    <dt class="text-muted-foreground">Seats</dt>
    <dd>{data.seats ?? "—"}</dd>
    <dt class="text-muted-foreground">Contact</dt>
    <dd>{data.contactEmail || "—"}</dd>
    <dt class="text-muted-foreground">Slug</dt>
    <dd class="font-mono">/{data.slug || ""}</dd>
    <dt class="text-muted-foreground">Audience</dt>
    <dd>{data.audience}</dd>
  </dl>

  {#if data.audience === "members" && data.membersNote}
    <p class="bg-muted rounded-md p-3 text-sm whitespace-pre-line">{data.membersNote}</p>
  {/if}

  {#if data.summary}
    <div class="prose prose-sm dark:prose-invert max-w-none">{@html data.summary}</div>
  {/if}

  <section class="space-y-2">
    <h2 class="text-lg font-semibold">Speakers</h2>
    <ul class="list-disc space-y-1 pl-5 text-sm">
      {#each data.speakers as speaker (speaker._id)}
        <li>
          {#if speaker.hasWebsite && speaker.website}
            <a class="underline" href={speaker.website}>{speaker.name}</a>
          {:else}
            {speaker.name}
          {/if}
        </li>
      {/each}
    </ul>
  </section>
</div>
