<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import Undo2Icon from "@lucide/svelte/icons/undo-2";
	import { Button } from "$lib/components/ui/button";
	import FieldDiff from "$lib/PageEditor/changes/FieldDiff.svelte";
	import type { FieldChange } from "$lib/PageEditor/changes/diff-model";
	import type { EditRecord } from "../edits";
	import { GLOBALS_TARGET, findField, schemaForInstance } from "../site-content";
	import { t } from "$lib/admin-i18n/i18n.svelte";

	let {
		edit,
		onUndo,
	}: {
		edit: EditRecord;
		onUndo: (edit: EditRecord) => Promise<void>;
	} = $props();

	let reviewing = $state(false);
	let undoing = $state(false);

	const isGlobals = $derived(edit.target === GLOBALS_TARGET);
	const href = $derived(
		isGlobals
			? "/admin/globals"
			: `/admin/page-editor/${edit.target.split("/").map(encodeURIComponent).join("/")}`,
	);

	const rows = $derived(
		edit.fields.map((field) => {
			const definition = findField(schemaForInstance(field.instanceId), field.fieldName);
			const change: FieldChange = {
				instanceId: field.instanceId,
				fieldName: field.fieldName,
				locale: field.locale,
				oldValue: field.before,
				newValue: field.after,
				kind: "changed",
			};
			return { field, definition, change };
		}),
	);

	const showInstanceIds = $derived(
		!isGlobals && new Set(edit.fields.map((field) => field.instanceId)).size > 1,
	);

	async function undo() {
		undoing = true;
		try {
			await onUndo(edit);
		} finally {
			undoing = false;
		}
	}
</script>

<div
	class="border-border bg-card rounded-lg border text-xs"
	class:opacity-70={Boolean(edit.undoneAt)}
>
	<div class="flex items-center gap-2 px-3 py-2">
		<div class="min-w-0 flex-1">
			<div class="truncate font-medium">
				{t("ai.changed")} <a {href} class="hover:underline">{edit.targetLabel}</a>
			</div>
			<div class="text-muted-foreground">
				{t("ai.fieldsDraft", { count: edit.fields.length })}
			</div>
		</div>
		<Button
			variant="ghost"
			size="xs"
			aria-expanded={reviewing}
			onclick={() => (reviewing = !reviewing)}
		>
			{reviewing ? t("ai.hide") : t("ai.review")}
		</Button>
		{#if edit.undoneAt}
			<span class="text-muted-foreground flex h-6 items-center gap-1 px-2">
				<CheckIcon class="size-3" aria-hidden="true" /> {t("ai.undone")}
			</span>
		{:else}
			<Button variant="outline" size="xs" disabled={undoing} onclick={undo}>
				<Undo2Icon aria-hidden="true" /> {t("ai.undo")}
			</Button>
		{/if}
	</div>

	{#if reviewing}
		<div class="border-border space-y-3 border-t px-3 py-3">
			{#each rows as row (`${row.field.instanceId}-${row.field.fieldName}-${row.field.locale}`)}
				{#if showInstanceIds}
					<div class="text-muted-foreground font-mono text-[10px]">{row.field.instanceId}</div>
				{/if}
				{#if row.definition}
					<FieldDiff field={row.definition} change={row.change} />
				{:else}
					<div class="text-muted-foreground">{t("ai.fieldGone", { field: row.field.fieldName })}</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
