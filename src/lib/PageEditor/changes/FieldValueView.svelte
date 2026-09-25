<script lang="ts">
	import type { FieldDefinition, SelectFieldDefinition } from "$lib/form-builder/core/types";
	import { fileNameFromPath, mediaUrl } from "$lib/form-builder/fields/FileUploadField/storage";

	let { field, value }: { field: FieldDefinition; value: unknown } = $props();

	const asArray = $derived(Array.isArray(value) ? (value as string[]) : []);
	const stringValue = $derived(typeof value === "string" ? value : "");

	function selectLabel(optionValue: string): string {
		const selectField = field as SelectFieldDefinition;
		const options = [
			...(selectField.options ?? []),
			...(selectField.groups ?? []).flatMap((group) => group.options),
		];
		return options.find((option) => option.value === optionValue)?.label ?? optionValue;
	}
</script>

{#if field.type === "toggle"}
	<span class="bg-muted inline-flex rounded px-2 py-0.5 text-sm">
		{value ? "On" : "Off"}
	</span>
{:else if field.type === "colorpicker"}
	<span class="inline-flex items-center gap-2">
		<span
			class="border-border size-4 shrink-0 rounded border"
			style="background-color: {stringValue || 'transparent'};"
		></span>
		<span class="font-mono text-sm">{stringValue || "—"}</span>
	</span>
{:else if field.type === "select"}
	{#if asArray.length > 0}
		<span class="flex flex-wrap gap-1">
			{#each asArray as optionValue (optionValue)}
				<span class="bg-muted rounded px-2 py-0.5 text-sm">{selectLabel(optionValue)}</span>
			{/each}
		</span>
	{:else if stringValue}
		<span class="bg-muted inline-flex rounded px-2 py-0.5 text-sm">{selectLabel(stringValue)}</span>
	{:else}
		<span class="text-muted-foreground text-sm italic">empty</span>
	{/if}
{:else if field.type === "file-upload"}
	{#if asArray.length > 0}
		<ul class="space-y-1">
			{#each asArray as path, index (index)}
				<li class="flex items-center gap-2">
					{#if /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(path)}
						<img
							src={mediaUrl(path)}
							alt=""
							loading="lazy"
							class="bg-muted size-8 shrink-0 rounded border object-cover"
						/>
					{/if}
					<span class="font-mono text-sm">{fileNameFromPath(path)}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<span class="text-muted-foreground text-sm italic">empty</span>
	{/if}
{:else if field.type === "rich-editor"}
	{#if stringValue}
		<!-- CMS content authored by an authenticated editor; rendered read-only for the diff. -->
		<div class="prose prose-sm dark:prose-invert max-w-none">{@html stringValue}</div>
	{:else}
		<span class="text-muted-foreground text-sm italic">empty</span>
	{/if}
{:else if stringValue}
	<span class="text-sm whitespace-pre-wrap">{stringValue}</span>
{:else}
	<span class="text-muted-foreground text-sm italic">empty</span>
{/if}
