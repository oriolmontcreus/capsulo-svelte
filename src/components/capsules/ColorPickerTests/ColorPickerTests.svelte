<script lang="ts">
	import { getCmsData } from "$lib/cms/get-cms-data";
	import * as Card from "$lib/components/ui/card";

	import { colorPickerTestsSchema } from "./colorpicker-tests.schema";
	import type { ColorPickerTestsData } from "./colorpicker-tests.schema.d";

	interface Props {
		instanceId: string;
	}

	let { instanceId }: Props = $props();

	const data = $derived(
		getCmsData<ColorPickerTestsData & Record<string, unknown>>(instanceId, colorPickerTestsSchema),
	);

	const displayFields = $derived(
		colorPickerTestsSchema.fields.map((field) => ({
			name: field.name,
			label: field.label ?? field.name,
			description: field.description,
			value: data[field.name as keyof typeof data],
		})),
	);
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
	<header class="space-y-2">
		<h1 class="text-2xl font-semibold tracking-tight">ColorPicker Field Tests</h1>
		<p class="text-muted-foreground text-sm">
			Live preview of all color picker configurations. Edit values in the admin prototype or CMS
			preview — selections appear here.
		</p>
		<p class="text-muted-foreground font-mono text-xs">instance: {instanceId}</p>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Current values</Card.Title>
			<Card.Description>
				{colorPickerTestsSchema.fields.length} fields from the colorpicker-tests schema
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<dl class="divide-border divide-y">
				{#each displayFields as field (field.name)}
					<div class="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
						<dt class="space-y-0.5">
							<span class="font-medium">{field.label}</span>
							<span class="text-muted-foreground block font-mono text-xs">{field.name}</span>
						</dt>
						<dd class="space-y-1">
							{#if typeof field.value === "string" && field.value}
								<div class="flex items-center gap-2">
									<span
										class="inline-block size-5 shrink-0 rounded border border-border"
										style="background-color: {field.value};"
									></span>
									<code class="text-sm font-mono">{field.value}</code>
								</div>
							{:else}
								<span class="text-muted-foreground text-sm italic">—</span>
							{/if}
							{#if field.description}
								<p class="text-muted-foreground text-xs">{field.description}</p>
							{/if}
						</dd>
					</div>
				{/each}
			</dl>
		</Card.Content>
	</Card.Root>

	{#if data.notes}
		<Card.Root>
			<Card.Header>
				<Card.Title>Notes</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-sm whitespace-pre-wrap">{data.notes}</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>