<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import SchemaRenderer from "$lib/form-builder/renderer/SchemaRenderer.svelte";
	import { getAllCapsules } from "$lib/capsules/core/registry";
	import type { SchemaValues } from "$lib/form-builder/core/types";

	interface Props {
		manifest: import("$lib/capsules/core/types").CapsuleManifest;
	}

	let { manifest }: Props = $props();

	const capsules = getAllCapsules();
	const pageIds = $derived(Object.keys(manifest));

	let selectedPageId = $state("");
	let instanceValues = $state<Record<string, SchemaValues>>({});

	const activePageId = $derived(
		selectedPageId && manifest[selectedPageId] ? selectedPageId : (pageIds[0] ?? "")
	);
	const selectedEntries = $derived(manifest[activePageId] ?? []);
</script>

<div class="space-y-4">
	{#if !pageIds.length}
		<Card.Root>
			<Card.Header>
				<Card.Title>No detected pages</Card.Title>
				<Card.Description>
					The manifest is empty, so there are no capsule detections to render yet.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Detected pages</Card.Title>
				<Card.Description>Select a page to inspect capsule instances.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				{#each pageIds as pageId (pageId)}
					<button
						type="button"
						class="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
						onclick={() => (selectedPageId = pageId)}
					>
						<Badge variant={activePageId === pageId ? "default" : "secondary"}>
							{pageId}
						</Badge>
					</button>
				{/each}
			</Card.Content>
		</Card.Root>

		<div class="space-y-4">
			{#each selectedEntries as entry, entryIndex (`${entry.capsuleKey}-${entryIndex}`)}
				{@const capsule = capsules.find((item) => item.key === entry.capsuleKey)}
				{@const count = Math.max(0, entry.occurrenceCount)}

				<Card.Root>
					<Card.Header>
						<Card.Title>{entry.componentName}</Card.Title>
						<Card.Description>
							Key: <code>{entry.capsuleKey}</code>
							{#if !capsule}
								- not found in registry.
							{/if}
						</Card.Description>
					</Card.Header>

					<Card.Content class="space-y-4">
						{#if capsule && count > 0}
							{#each Array.from({ length: count }) as _, index (`${entry.capsuleKey}-${entryIndex}-${index}`)}
								{@const instanceId = `${entry.capsuleKey}-${entryIndex}-${index}`}
								<div class="space-y-3 rounded-md border p-3">
									<div class="flex items-center justify-between">
										<h4 class="text-sm font-semibold">Instance {index + 1}</h4>
										<Badge variant="outline">{instanceId}</Badge>
									</div>

									<SchemaRenderer
										schema={capsule.schema}
										onValuesChange={(nextValues) => {
											instanceValues = {
												...instanceValues,
												[instanceId]: nextValues
											};
										}}
									/>

									<pre class="bg-muted overflow-x-auto rounded-md p-3 text-xs">
{JSON.stringify(instanceValues[instanceId] ?? {}, null, 2)}</pre
									>
								</div>
							{/each}
						{:else if capsule && count === 0}
							<p class="text-muted-foreground text-sm">No instances detected for this entry.</p>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
