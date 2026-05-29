<script lang="ts">
	import { getCmsData } from "$lib/cms/get-cms-data";
	import { Badge } from "$lib/components/ui/badge";
	import * as Card from "$lib/components/ui/card";

	import { selectTestsSchema } from "./select-tests.schema";
	import type { SelectTestsData } from "./select-tests.schema.d";

	interface Props {
		instanceId: string;
	}

	let { instanceId }: Props = $props();

	const data = $derived(
		getCmsData<SelectTestsData & Record<string, unknown>>(instanceId, selectTestsSchema),
	);

	const displayFields = $derived(
		selectTestsSchema.fields.map((field) => ({
			name: field.name,
			label: field.label ?? field.name,
			description: field.description,
			value: data[field.name as keyof typeof data],
		})),
	);
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
	<header class="space-y-2">
		<h1 class="text-2xl font-semibold tracking-tight">Select Field Tests</h1>
		<p class="text-muted-foreground text-sm">
			Live preview of all select configurations. Edit values in the admin prototype or CMS
			preview — selections appear here.
		</p>
		<p class="text-muted-foreground font-mono text-xs">instance: {instanceId}</p>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Current values</Card.Title>
			<Card.Description>
				{selectTestsSchema.fields.length} fields from the select-tests schema
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
							{#if field.value}
								<Badge variant="secondary" class="font-mono">
									{String(field.value)}
								</Badge>
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
				<p class="text-sm">{data.notes}</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
