<script lang="ts">
	import { getCapsuleByKey } from "$lib/capsules/core/registry";
	import type { FieldDefinition } from "$lib/form-builder/core/types";
	import type { InstanceChange } from "./diff-model";
	import FieldDiff from "./FieldDiff.svelte";
	import { capsuleKeyFromInstanceId } from "./schema-defaults";

	let { instance }: { instance: InstanceChange } = $props();

	const capsuleKey = $derived(capsuleKeyFromInstanceId(instance.instanceId));
	const capsule = $derived(getCapsuleByKey(capsuleKey));
	const title = $derived(
		capsule?.meta?.displayName ?? capsule?.schema.name ?? capsuleKey,
	);

	function findField(fieldName: string): FieldDefinition | undefined {
		return capsule?.schema.fields.find((field) => field.name === fieldName);
	}
</script>

<section class="space-y-4">
	<div class="flex items-center gap-2">
		<h3 class="text-lg font-medium tracking-tight">{title}</h3>
		{#if instance.isNew}
			<span class="rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
				New
			</span>
		{/if}
	</div>

	<div class="space-y-4">
		{#each instance.fields as change (change.fieldName + "::" + change.locale)}
			{@const field = findField(change.fieldName)}
			{#if field}
				<FieldDiff {field} {change} />
			{/if}
		{/each}
	</div>
</section>
