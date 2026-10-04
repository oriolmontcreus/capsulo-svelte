<script lang="ts">
	import { DEFAULT_LOCALE } from "../../config/i18n-config";
	import type { RepeaterFieldDefinition } from "../../form-builder/core/types";
	import FieldValueView from "./FieldValueView.svelte";
	import InlineTextDiff from "./InlineTextDiff.svelte";
	import RepeaterDiff from "./RepeaterDiff.svelte";
	import RepeaterItemValues from "./RepeaterItemValues.svelte";
	import { diffRepeaterItems, repeaterItemTitle } from "./repeater-diff";
	import { t } from "../../admin-i18n/i18n.svelte";

	/** Item-level diff of a repeater: added, removed, moved and edited items. */
	let {
		field,
		oldValue,
		newValue,
	}: { field: RepeaterFieldDefinition; oldValue: unknown; newValue: unknown } = $props();

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

{#if changes.length === 0}
	<span class="text-muted-foreground text-sm italic">{t("diff.noItemChanges")}</span>
{:else}
	<ul class="space-y-2">
		{#each changes as change (`${change.kind}-${change.item._id}`)}
			{@const title = repeaterItemTitle(field, change.item, change.index, DEFAULT_LOCALE)}
			<li class="border-border space-y-2 rounded-md border px-3 py-2">
				<div class="flex min-w-0 items-center gap-2">
					{#if change.kind === "added"}
						<span class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase {badgeClass.added}">{t("diff.added")}</span>
					{:else if change.kind === "removed"}
						<span class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase {badgeClass.removed}">{t("diff.removed")}</span>
					{:else}
						{#if change.changes.length > 0}
							<span class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase {badgeClass.changed}">{t("diff.edited")}</span>
						{/if}
						{#if change.moved}
							<span class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase {badgeClass.moved}">
								Moved {change.oldIndex + 1} → {change.index + 1}
							</span>
						{/if}
					{/if}
					<span class="truncate text-sm font-medium" class:line-through={change.kind === "removed"}>{title}</span>
				</div>

				{#if change.kind === "added"}
					<RepeaterItemValues {field} item={change.item} />
				{:else if change.kind === "removed"}
					<div class="opacity-70"><RepeaterItemValues {field} item={change.item} /></div>
				{:else if change.changes.length > 0}
					<div class="space-y-2">
						{#each change.changes as childChange (`${childChange.field.name}-${childChange.locale}`)}
							<div class="space-y-1">
								<div class="text-muted-foreground flex items-center gap-1.5 text-[11px]">
									{childChange.field.label ?? childChange.field.name}
									{#if childChange.locale !== DEFAULT_LOCALE}
										<span class="bg-muted rounded px-1 text-[10px] uppercase">{childChange.locale}</span>
									{/if}
								</div>
								{#if childChange.field.type === "repeater"}
									<RepeaterDiff
										field={childChange.field}
										oldValue={childChange.oldValue}
										newValue={childChange.newValue}
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
