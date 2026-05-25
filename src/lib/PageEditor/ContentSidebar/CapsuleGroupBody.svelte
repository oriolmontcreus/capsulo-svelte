<script lang="ts">
	import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
	import SchemaRenderer from "$lib/form-builder/renderer/SchemaRenderer.svelte";
	import type { RegisteredCapsule } from "$lib/capsules/core/types";
	import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
	import type { SchemaValues } from "$lib/form-builder/core/types";

	type Props = {
		panelId: string;
		capsuleKey: string;
		capsule: RegisteredCapsule | undefined;
		flatInstanceKeys: string[];
		instanceIds: string[];
		locale: string;
		valuesByInstance: PageEditorValuesByInstance;
		schemaHydrationVersion: number;
		onInstanceValuesChange: (instanceId: string, values: SchemaValues) => void;
	};

	let {
		panelId,
		capsuleKey,
		capsule,
		flatInstanceKeys,
		instanceIds,
		locale,
		valuesByInstance,
		schemaHydrationVersion,
		onInstanceValuesChange,
	}: Props = $props();
</script>

<div id={panelId}>
	{#if !capsule}
		<p class="text-destructive px-3 py-2.5 text-xs">
			Capsule key "{capsuleKey}" is not registered. Schema renderer skipped for this
			group.
		</p>
	{:else}
		{#each flatInstanceKeys as instanceKey, instanceIndex (instanceKey)}
			{@const instanceId = instanceIds[instanceIndex]}
			{#if instanceIndex > 0}
				<div
					class="border-border border-t"
					role="separator"
					aria-hidden="true"
				></div>
			{/if}
			<div class="px-3 py-3">
				{#key `${instanceId}-${schemaHydrationVersion}`}
					<SchemaRenderer
						schema={capsule.schema}
						initialValues={valuesByInstance[instanceId]}
						locales={LOCALES}
						defaultLocale={DEFAULT_LOCALE}
						editingLocale={locale}
						translatableLocaleMode="active-only"
						onValuesChange={(nextValues) =>
							onInstanceValuesChange(instanceId, nextValues)}
					/>
				{/key}
			</div>
		{/each}
	{/if}
</div>
