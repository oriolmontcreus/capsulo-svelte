<script lang="ts">
	import type { Snippet } from "svelte";
	import { DEFAULT_LOCALE } from "../../config/i18n-config";
	import type { FieldDefinition } from "../../form-builder/core/types";
	import { isPasswordField } from "../../form-builder/fields/TextField/text-field.utils";
	import type { FieldChange } from "./diff-model";
	import InlineTextDiff from "./InlineTextDiff.svelte";
	import FieldValueView from "./FieldValueView.svelte";
	import RepeaterDiff from "./RepeaterDiff.svelte";
	import { t } from "../../admin-i18n/i18n.svelte";

	let {
		field,
		change,
		action,
	}: {
		field: FieldDefinition;
		change: FieldChange;
		/** Per-field Revert (Changes page) or Recover (History page) control. */
		action?: Snippet<[FieldChange]>;
	} = $props();

	const isInline = $derived((field.type === "text" || field.type === "textarea") && !isPasswordField(field));
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

	{#if field.type === "repeater"}
		<RepeaterDiff {field} oldValue={change.oldValue} newValue={change.newValue} />
	{:else if isInline}
		<InlineTextDiff oldText={asText(change.oldValue)} newText={asText(change.newValue)} />
	{:else}
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-1 opacity-70">
				<div class="text-muted-foreground text-[10px] uppercase">{t("diff.previous")}</div>
				<FieldValueView {field} value={change.oldValue} />
			</div>
			<div class="space-y-1">
				<div class="text-muted-foreground text-[10px] uppercase">{t("diff.new")}</div>
				<FieldValueView {field} value={change.newValue} />
			</div>
		</div>
	{/if}

	{#if action}
		<!-- focus-within keeps the control reachable for keyboard users, which the
		     legacy hover-only implementation made impossible. -->
		<div
			class="absolute top-0 right-0 opacity-0 transition-opacity group-hover/field:opacity-100 focus-within:opacity-100"
		>
			{@render action(change)}
		</div>
	{/if}
</div>
