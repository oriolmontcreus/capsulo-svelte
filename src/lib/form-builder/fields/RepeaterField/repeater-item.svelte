<script lang="ts">
	import ChevronDown from "@lucide/svelte/icons/chevron-down";
	import ArrowDown from "@lucide/svelte/icons/arrow-down";
	import ArrowUp from "@lucide/svelte/icons/arrow-up";
	import Copy from "@lucide/svelte/icons/copy";
	import Ellipsis from "@lucide/svelte/icons/ellipsis";
	import GripVertical from "@lucide/svelte/icons/grip-vertical";
	import Trash2 from "@lucide/svelte/icons/trash-2";
	import { slide } from "svelte/transition";
	import { Button } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import * as Popover from "$lib/components/ui/popover";
	import type { FieldValue } from "../../core/types";
	import { repeaterItemValues } from "../../core/translation-runtime";
	import SchemaFieldList from "../../renderer/SchemaFieldList.svelte";
	import { applySchemaFieldUpdate } from "../../renderer/schema-renderer-i18n";
	import { getSchemaRendererContext } from "../../renderer/schema-renderer-context";
	import { getRepeaterItemSummary, repeaterItemLabel } from "./modules/repeater-values";
	import type { RepeaterFieldDefinition, RepeaterItem } from "./repeater-field.types";

	interface Props {
		field: RepeaterFieldDefinition;
		item: RepeaterItem;
		index: number;
		count: number;
		expanded: boolean;
		canAdd: boolean;
		canRemove: boolean;
		/** Unique DOM id stem for this item. */
		idPrefix: string;
		dragging: boolean;
		onChange: (item: RepeaterItem) => void;
		onToggle: () => void;
		onMove: (to: number) => void;
		onDuplicate: () => void;
		onRemove: () => void;
		onHandlePointerDown: () => void;
	}

	let {
		field,
		item,
		index,
		count,
		expanded,
		canAdd,
		canRemove,
		idPrefix,
		dragging,
		onChange,
		onToggle,
		onMove,
		onDuplicate,
		onRemove,
		onHandlePointerDown,
	}: Props = $props();

	const renderer = getSchemaRendererContext();
	const itemName = $derived(field.itemName ?? "item");
	const summary = $derived(
		getRepeaterItemSummary(field, item, renderer.i18n.editingLocale, renderer.i18n.defaultLocale),
	);
	const label = $derived(repeaterItemLabel(field, index));
	const values = $derived(repeaterItemValues(item));
	const contentId = $derived(`${idPrefix}-content`);

	let menuTrigger = $state<HTMLElement | null>(null);
	let confirmOpen = $state(false);

	function updateChild(fieldName: string, locale: string, nextValue: FieldValue) {
		const next = applySchemaFieldUpdate(
			{ fields: field.fields },
			values,
			fieldName,
			locale,
			nextValue,
			renderer.i18n,
		);
		onChange({ ...next, _id: item._id });
	}
</script>

<div
	class="bg-card ring-foreground/10 rounded-lg shadow-xs ring-1 transition-opacity"
	class:opacity-40={dragging}
	data-slot="repeater-item"
>
	<div class="flex items-center gap-1 py-1.5 pr-1.5 pl-1">
		<button
			type="button"
			class="text-muted-foreground hover:text-foreground flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md active:cursor-grabbing"
			aria-label="Drag to reorder {label}"
			title="Drag to reorder"
			onpointerdown={onHandlePointerDown}
		>
			<GripVertical class="size-4" aria-hidden="true" />
		</button>

		<button
			type="button"
			class="hover:bg-muted/60 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left"
			aria-expanded={expanded}
			aria-controls={contentId}
			onclick={onToggle}
		>
			<span class="text-muted-foreground shrink-0 text-xs tabular-nums">{index + 1}</span>
			<span class="truncate text-sm font-medium" class:text-muted-foreground={!summary}>
				{summary ?? label}
			</span>
			<ChevronDown
				class="text-muted-foreground ml-auto size-4 shrink-0 transition-transform {expanded ? 'rotate-180' : ''}"
				aria-hidden="true"
			/>
		</button>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						bind:ref={menuTrigger}
						variant="ghost"
						size="icon-sm"
						aria-label="Actions for {label}"
					>
						<Ellipsis aria-hidden="true" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-44">
				<DropdownMenu.Item disabled={index === 0} onSelect={() => onMove(index - 1)}>
					<ArrowUp aria-hidden="true" /> Move up
				</DropdownMenu.Item>
				<DropdownMenu.Item disabled={index === count - 1} onSelect={() => onMove(index + 1)}>
					<ArrowDown aria-hidden="true" /> Move down
				</DropdownMenu.Item>
				<DropdownMenu.Item disabled={!canAdd} onSelect={onDuplicate}>
					<Copy aria-hidden="true" /> Duplicate
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item
					variant="destructive"
					disabled={!canRemove}
					onSelect={() => (confirmOpen = true)}
				>
					<Trash2 aria-hidden="true" /> Delete
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<Popover.Root bind:open={confirmOpen}>
			<Popover.Content customAnchor={menuTrigger} side="bottom" align="end" class="w-64 gap-3">
				<Popover.Header>
					<Popover.Title>Delete this {itemName}?</Popover.Title>
					<Popover.Description>
						{summary ? `"${summary}"` : label} is removed in every language.
					</Popover.Description>
				</Popover.Header>
				<div class="flex justify-end gap-2">
					<Button variant="outline" size="sm" onclick={() => (confirmOpen = false)}>Cancel</Button>
					<Button
						variant="destructive"
						size="sm"
						onclick={() => {
							confirmOpen = false;
							onRemove();
						}}
					>
						Delete
					</Button>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>

	{#if expanded}
		<div id={contentId} class="border-border border-t px-3 py-3" transition:slide={{ duration: 150 }}>
			<SchemaFieldList
				fields={field.fields}
				{values}
				context={renderer.i18n}
				translatableLocaleMode={renderer.translatableLocaleMode}
				{idPrefix}
				onFieldChange={updateChild}
			/>
		</div>
	{/if}
</div>
