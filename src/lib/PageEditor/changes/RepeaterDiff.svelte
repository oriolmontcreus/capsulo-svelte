<script lang="ts">
	import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
	import { Button } from "$lib/components/ui/button";
	import type { RepeaterFieldDefinition, RepeaterItem } from "$lib/form-builder/core/types";
	import FieldValueView from "./FieldValueView.svelte";
	import InlineTextDiff from "./InlineTextDiff.svelte";
	import RepeaterDiff from "./RepeaterDiff.svelte";
	import RepeaterItemValues from "./RepeaterItemValues.svelte";
	import {
		diffRepeaterItems,
		repeaterItemTitle,
		revertAddedItem,
		revertItem,
		setItemFieldValue,
	} from "./repeater-diff";

	/**
	 * Item-level diff of a repeater: added, removed, moved and edited items. With
	 * `onRevert` (Changes page), each item and each changed item field gets a Revert
	 * button that hands back the whole list with just that part restored.
	 */
	let {
		field,
		oldValue,
		newValue,
		onRevert,
	}: {
		field: RepeaterFieldDefinition;
		oldValue: unknown;
		newValue: unknown;
		onRevert?: (items: RepeaterItem[]) => void;
	} = $props();

	const changes = $derived(diffRepeaterItems(field, oldValue, newValue));

	function asText(input: unknown): string {
		return typeof input === "string" ? input : "";
	}

	const badgeClass = {
		added: "bg-green-500/15 text-green-700 dark:text-green-300",
		removed: "bg-red-500/15 text-red-700 dark:text-red-300",
		changed: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
		moved: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
	};
</script>

<!-- Shown on hover, like the field-level Revert, but only for the innermost hovered item so
     nested items don't light up every enclosing button. focus-visible keeps it keyboard reachable. -->
{#snippet revertButton(title: string, revert: () => RepeaterItem[], reveal: string)}
	{#if onRevert}
		<Button
			variant="ghost"
			size="xs"
			class="ml-auto shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 {reveal}"
			{title}
			onclick={() => onRevert(revert())}
		>
			Revert
		</Button>
	{/if}
{/snippet}

{#if changes.length === 0}
	<span class="text-muted-foreground text-sm italic">No item changes</span>
{:else}
	<ul class="space-y-2">
		{#each changes as change (`${change.kind}-${change.item._id}`)}
			{@const title = repeaterItemTitle(field, change.item, change.index, DEFAULT_LOCALE)}
			<li class="border-border space-y-2 rounded-md border px-3 py-2">
				<div class="flex min-h-6 min-w-0 items-center gap-2">
					{#if change.kind === "added"}
						<span class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase {badgeClass.added}">Added</span>
					{:else if change.kind === "removed"}
						<span class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase {badgeClass.removed}">Removed</span>
					{:else}
						{#if change.changes.length > 0}
							<span class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase {badgeClass.changed}">Edited</span>
						{/if}
						{#if change.moved}
							<span class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase {badgeClass.moved}">
								Moved {change.oldIndex + 1} → {change.index + 1}
							</span>
						{/if}
					{/if}
					<span class="truncate text-sm font-medium" class:line-through={change.kind === "removed"}>{title}</span>
					{#if change.kind === "added"}
						{@render revertButton("Remove this new item", () => revertAddedItem(newValue, change.item._id), "[li:hover:not(:has(li:hover))>div>&]:opacity-100")}
					{:else if change.kind === "removed"}
						{@render revertButton("Bring this item back where it was", () =>
							revertItem(oldValue, newValue, change.item._id),
							"[li:hover:not(:has(li:hover))>div>&]:opacity-100",
						)}
					{:else}
						{@render revertButton(
							change.changes.length > 0
								? "Restore this item's committed values and position"
								: "Move this item back where it was",
							() => revertItem(oldValue, newValue, change.item._id),
							"[li:hover:not(:has(li:hover))>div>&]:opacity-100",
						)}
					{/if}
				</div>

				{#if change.kind === "added"}
					<RepeaterItemValues {field} item={change.item} />
				{:else if change.kind === "removed"}
					<div class="opacity-70"><RepeaterItemValues {field} item={change.item} /></div>
				{:else if change.changes.length > 0}
					<div class="space-y-2">
						{#each change.changes as childChange (`${childChange.field.name}-${childChange.locale}`)}
							{@const revertChild = (value: unknown) =>
								setItemFieldValue(oldValue, newValue, change.item._id, childChange.field.name, childChange.locale, value)}
							<div class="space-y-1" data-repeater-child>
								<div class="text-muted-foreground flex min-h-6 items-center gap-1.5 text-[11px]">
									{childChange.field.label ?? childChange.field.name}
									{#if childChange.locale !== DEFAULT_LOCALE}
										<span class="bg-muted rounded px-1 text-[10px] uppercase">{childChange.locale}</span>
									{/if}
									{@render revertButton("Restore the committed value of this field", () =>
										revertChild(childChange.oldValue),
										"[[data-repeater-child]:hover:not(:has(li:hover))>div>&]:opacity-100",
									)}
								</div>
								{#if childChange.field.type === "repeater"}
									<RepeaterDiff
										field={childChange.field}
										oldValue={childChange.oldValue}
										newValue={childChange.newValue}
										onRevert={onRevert && ((nested) => onRevert(revertChild(nested)))}
									/>
								{:else if childChange.field.type === "text" || childChange.field.type === "textarea"}
									<InlineTextDiff oldText={asText(childChange.oldValue)} newText={asText(childChange.newValue)} />
								{:else}
									<div class="grid grid-cols-2 gap-3">
										<div class="opacity-70"><FieldValueView field={childChange.field} value={childChange.oldValue} /></div>
										<div><FieldValueView field={childChange.field} value={childChange.newValue} /></div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
