<script lang="ts">
	import { getCmsData } from "capsulo/runtime";

	import { heroSchema } from "./hero.schema";
	import type { HeroData } from "./hero.schema.d";

	interface Props {
		instanceId: string;
	}

	let { instanceId }: Props = $props();

	const data = $derived(getCmsData<HeroData & Record<string, unknown>>(instanceId, heroSchema));
</script>

<section class="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
	<h1 class="text-4xl font-semibold tracking-tight text-balance md:text-6xl">{data.title}</h1>
	{#if data.subtitle}
		<p class="text-lg text-neutral-600 text-balance">{data.subtitle}</p>
	{/if}
	{#if data.ctaLabel}
		<a href={data.ctaHref ?? "#"} class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
			{data.ctaLabel}
		</a>
	{/if}
</section>
