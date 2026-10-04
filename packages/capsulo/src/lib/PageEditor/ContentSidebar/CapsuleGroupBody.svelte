<script lang="ts">
	import { DEFAULT_LOCALE, LOCALES } from "../../config/i18n-config";
	import SchemaRenderer from "../../form-builder/renderer/SchemaRenderer.svelte";
	import type { RegisteredCapsule } from "../../capsules/core/types";
	import type { PageEditorValuesByInstance } from "../persistence";
	import type { SchemaValues } from "../../form-builder/core/types";
	import type { FieldFocusRequest } from "../../form-builder/renderer/schema-renderer-context";
	import type { FieldFocusTarget } from "./types";
	import { t } from "../../admin-i18n/i18n.svelte";

	type Props = {
		panelId: string;
		capsuleKey: string;
		capsule: RegisteredCapsule | undefined;
		flatInstanceKeys: string[];
		instanceIds: string[];
		locale: string;
		valuesByInstance: PageEditorValuesByInstance;
		schemaHydrationVersion: number;
		focusTarget?: FieldFocusTarget | null;
		showAllErrors?: boolean;
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
		focusTarget = null,
		showAllErrors = false,
		onInstanceValuesChange,
	}: Props = $props();

	// One request object per target, so each renderer handles it once.
	const focusRequest = $derived<FieldFocusRequest | null>(focusTarget ? { path: focusTarget.path } : null);
</script>

<div id={panelId}>
	{#if !capsule}
		<p class="text-destructive px-3 py-2.5 text-xs">
			{t("sidebar.capsuleNotRegistered", { key: capsuleKey })}
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
						{showAllErrors}
						focusRequest={focusTarget?.instanceId === instanceId ? focusRequest : null}
						onValuesChange={(nextValues) =>
							onInstanceValuesChange(instanceId, nextValues)}
					/>
				{/key}
			</div>
		{/each}
	{/if}
</div>
