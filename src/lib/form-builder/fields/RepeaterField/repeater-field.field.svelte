<script lang="ts">
	import ChevronsDownUp from "@lucide/svelte/icons/chevrons-down-up";
	import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
	import Languages from "@lucide/svelte/icons/languages";
	import Plus from "@lucide/svelte/icons/plus";
	import { tick } from "svelte";
	import { flip } from "svelte/animate";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Field, FieldDescription, FieldError } from "$lib/components/ui/field";
	import { getSchemaRendererContext } from "../../renderer/schema-renderer-context";
	import {
		createEmptyRepeaterItem,
		duplicateRepeaterItem,
		moveRepeaterItem,
	} from "./modules/repeater-values";
	import type { RepeaterFieldDefinition, RepeaterItem } from "./repeater-field.types";
	import RepeaterItemCard from "./repeater-item.svelte";

	interface Props {
		field: RepeaterFieldDefinition;
		value: RepeaterItem[];
		onValueChange: (value: RepeaterItem[]) => void;
		error?: string;
		/** This repeater's path from the schema root (field names and item ids). */
		path?: string[];
	}

	let { field, value, onValueChange, error, path }: Props = $props();
	const fieldPath = $derived(path ?? [field.name]);

	const renderer = getSchemaRendererContext();
	const items = $derived(Array.isArray(value) ? value : []);
	const itemName = $derived(field.itemName ?? "item");
	const pluralName = $derived(field.itemPluralName ?? (field.itemName ? `${field.itemName}s` : "items"));
	const canAdd = $derived(field.maxItems === undefined || items.length < field.maxItems);
	const canRemove = $derived(items.length > (field.minItems ?? 0));
	const editingOtherLocale = $derived(renderer.i18n.editingLocale !== renderer.i18n.defaultLocale);
	const labelId = $derived(`${field.name}-label`);

	/** UI only: which items show their fields. New and duplicated items open. */
	let expanded = $state<Record<string, boolean>>({});
	const allExpanded = $derived(items.length > 0 && items.every((item) => expanded[item._id]));

	// Native drag and drop, armed from the handle so text in the fields stays selectable.
	let armedId = $state<string | null>(null);
	let dragIndex = $state<number | null>(null);
	/** Insertion point, 0..items.length. */
	let dropIndex = $state<number | null>(null);
	const showDropAt = $derived(
		dragIndex !== null && dropIndex !== null && dropIndex !== dragIndex && dropIndex !== dragIndex + 1
			? dropIndex
			: null,
	);

	// Open the items that hold errors when every error is shown (after a blocked commit), and
	// the item a "go to field" link points into. Once per item, so closing it again sticks.
	let autoOpened: Record<string, true> = {};
	$effect(() => {
		const request = renderer.validation.focusRequest;
		const showAll = renderer.validation.showAll;
		for (const item of items) {
			const itemPath = [...fieldPath, item._id];
			const focused =
				request !== null &&
				request.path.length > itemPath.length &&
				itemPath.every((segment, index) => request.path[index] === segment);
			const hasErrors = showAll && renderer.validation.errorCountWithin(itemPath) > 0;
			if ((focused || hasErrors) && !autoOpened[item._id]) {
				autoOpened[item._id] = true;
				expanded[item._id] = true;
			}
		}
	});

	function itemDomId(item: RepeaterItem): string {
		return `${field.name}-${item._id}`;
	}

	async function reveal(item: RepeaterItem) {
		expanded[item._id] = true;
		await tick();
		document.getElementById(itemDomId(item))?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}

	function addItem() {
		if (!canAdd) return;
		const item = createEmptyRepeaterItem(field, renderer.i18n.defaultLocale);
		onValueChange([...items, item]);
		void reveal(item);
	}

	function updateItem(index: number, item: RepeaterItem) {
		onValueChange(items.map((current, currentIndex) => (currentIndex === index ? item : current)));
	}

	function duplicateItem(index: number) {
		if (!canAdd) return;
		const copy = duplicateRepeaterItem(field, items[index]);
		onValueChange([...items.slice(0, index + 1), copy, ...items.slice(index + 1)]);
		void reveal(copy);
	}

	function removeItem(index: number) {
		if (!canRemove) return;
		const { [items[index]._id]: _removed, ...rest } = expanded;
		expanded = rest;
		onValueChange(items.filter((_, currentIndex) => currentIndex !== index));
	}

	function moveItem(from: number, to: number) {
		const next = moveRepeaterItem(items, from, to);
		if (next !== items) onValueChange(next);
	}

	function toggleAll() {
		const open = !allExpanded;
		expanded = Object.fromEntries(items.map((item) => [item._id, open]));
	}

	function resetDrag() {
		armedId = null;
		dragIndex = null;
		dropIndex = null;
	}

	function handleDragStart(event: DragEvent, index: number) {
		// Ignore drags bubbling up from a nested repeater's items.
		if (event.target !== event.currentTarget) return;
		event.stopPropagation();
		dragIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = "move";
			event.dataTransfer.setData("text/plain", items[index]._id);
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		if (dragIndex === null) return;
		event.preventDefault();
		event.stopPropagation();
		if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		dropIndex = event.clientY < rect.top + rect.height / 2 ? index : index + 1;
	}

	function handleDrop(event: DragEvent) {
		if (dragIndex === null) return;
		event.preventDefault();
		event.stopPropagation();
		if (dropIndex !== null) moveItem(dragIndex, dropIndex > dragIndex ? dropIndex - 1 : dropIndex);
		resetDrag();
	}
</script>

<svelte:window onpointerup={() => dragIndex === null && (armedId = null)} />

<Field data-invalid={error ? "true" : undefined} role="group" aria-labelledby={labelId}>
	<div class="flex items-center gap-2">
		<span id={labelId} class="text-sm leading-snug font-medium">
			{field.label ?? field.name}
			{#if field.required}
				<span class="text-destructive">*</span>
			{/if}
		</span>
		<Badge variant="secondary" class="tabular-nums">
			{items.length}{field.maxItems !== undefined ? ` / ${field.maxItems}` : ""}
		</Badge>
		{#if items.length > 1}
			<Button variant="ghost" size="xs" class="text-muted-foreground ml-auto" onclick={toggleAll}>
				{#if allExpanded}
					<ChevronsDownUp aria-hidden="true" /> Collapse all
				{:else}
					<ChevronsUpDown aria-hidden="true" /> Expand all
				{/if}
			</Button>
		{/if}
	</div>

	{#if field.description}
		<FieldDescription>{field.description}</FieldDescription>
	{/if}

	{#if editingOtherLocale && items.length > 0}
		<p class="text-muted-foreground flex items-start gap-1.5 text-xs">
			<Languages class="mt-px size-3.5 shrink-0" aria-hidden="true" />
			Adding, removing or reordering {pluralName} applies to every language.
		</p>
	{/if}

	{#if items.length > 0}
		<div class="flex flex-col gap-2" role="list">
			{#each items as item, index (item._id)}
				<div
					id={itemDomId(item)}
					class="relative"
					role="listitem"
					draggable={armedId === item._id}
					animate:flip={{ duration: 200 }}
					ondragstart={(event) => handleDragStart(event, index)}
					ondragover={(event) => handleDragOver(event, index)}
					ondrop={handleDrop}
					ondragend={resetDrag}
				>
					{#if showDropAt === index}
						<div class="bg-primary absolute inset-x-0 -top-[5px] h-0.5 rounded-full" aria-hidden="true"></div>
					{/if}
					<RepeaterItemCard
						{field}
						{item}
						{index}
						count={items.length}
						expanded={Boolean(expanded[item._id])}
						{canAdd}
						{canRemove}
						idPrefix={itemDomId(item)}
						path={[...fieldPath, item._id]}
						dragging={dragIndex === index}
						onChange={(next) => updateItem(index, next)}
						onToggle={() => (expanded[item._id] = !expanded[item._id])}
						onMove={(to) => moveItem(index, to)}
						onDuplicate={() => duplicateItem(index)}
						onRemove={() => removeItem(index)}
						onHandlePointerDown={() => (armedId = item._id)}
					/>
					{#if showDropAt === items.length && index === items.length - 1}
						<div class="bg-primary absolute inset-x-0 -bottom-[5px] h-0.5 rounded-full" aria-hidden="true"></div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm">
			No {pluralName} yet
		</div>
	{/if}

	<div class="flex flex-col gap-1">
		<Button variant="outline" size="sm" class="w-full border-dashed" disabled={!canAdd} onclick={addItem}>
			<Plus aria-hidden="true" /> Add {itemName}
		</Button>
		{#if !canAdd}
			<p class="text-muted-foreground text-center text-xs">
				Maximum of {field.maxItems} {field.maxItems === 1 ? itemName : pluralName} reached.
			</p>
		{/if}
	</div>

	{#if error}
		<FieldError>{error}</FieldError>
	{/if}
</Field>
