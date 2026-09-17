<script lang="ts">
	import type { Snippet } from "svelte";
	import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
	import type { FieldDefinition } from "$lib/form-builder/core/types";
	import type { FieldChange } from "./diff-model";
	import InlineTextDiff from "./InlineTextDiff.svelte";
	import FieldValueView from "./FieldValueView.svelte";

	let {
		field,
		change,
		action,
	}: {
		field: FieldDefinition;
		change: FieldChange;
		/** Placeholder for the future per-field Revert button (wired in Phase 6). */
		action?: Snippet;
	} = $props();

	const isInline = $derived(field.type === "text" || field.type === "textarea");
	const showLocale = $derived(change.locale !== DEFAULT_LOCALE);
	const label = $derived(field.label ?? field.name);

	function asText(input: unknown): string {
		if (typeof input === "string") return input;
		if (input === null || input === undefined) return "";
		return String(input);
	}
</script>

<div class="group/field relative space-y-1.5">
	<div class="flex items-center gap-2">
		<span class="text-muted-foreground text-xs font-medium">{label}</span>
		{#if showLocale}
			<span class="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] uppercase">
				{change.locale}
			</span>
		{/if}
	</div>

	{#if isInline}
		<InlineTextDiff oldText={asText(change.oldValue)} newText={asText(change.newValue)} />
	{:else}
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-1 opacity-70">
				<div class="text-muted-foreground text-[10px] uppercase">Previous</div>
				<FieldValueView {field} value={change.oldValue} />
			</div>
			<div class="space-y-1">
				<div class="text-muted-foreground text-[10px] uppercase">New</div>
				<FieldValueView {field} value={change.newValue} />
			</div>
		</div>
	{/if}

	{#if action}
		<div class="absolute top-0 right-0 opacity-0 transition-opacity group-hover/field:opacity-100">
			{@render action()}
		</div>
	{/if}
</div>
