<script lang="ts">
	import type { Snippet } from "svelte";
	import type { FieldDefinition } from "../../form-builder/core/types";
	import type { FieldChange, InstanceChange } from "./diff-model";
	import FieldDiff from "./FieldDiff.svelte";
	import { capsuleKeyFromInstanceId, resolveInstanceSchema } from "./schema-defaults";
	import { t } from "../../admin-i18n/i18n.svelte";

	let {
		instance,
		fieldAction,
	}: {
		instance: InstanceChange;
		fieldAction?: Snippet<[FieldChange]>;
	} = $props();

	const resolved = $derived(resolveInstanceSchema(instance.instanceId));
	const title = $derived(resolved?.title ?? capsuleKeyFromInstanceId(instance.instanceId));

	function findField(fieldName: string): FieldDefinition | undefined {
		return resolved?.schema.fields.find((field) => field.name === fieldName);
	}
</script>

<section class="space-y-4">
	<div class="flex items-center gap-2">
		<h3 class="text-lg font-medium tracking-tight">{title}</h3>
		{#if instance.isNew}
			<span class="rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
				{t("diff.newInstance")}
			</span>
		{:else if instance.isRemoved}
			<span class="bg-destructive rounded px-1.5 py-0.5 text-[10px] font-medium text-white">
				{t("diff.removed")}
			</span>
		{/if}
	</div>

	<div class="space-y-4">
		{#each instance.fields as change (change.fieldName + "::" + change.locale)}
			{@const field = findField(change.fieldName)}
			{#if field}
				<FieldDiff {field} {change} action={fieldAction} />
			{/if}
		{/each}
	</div>
</section>
