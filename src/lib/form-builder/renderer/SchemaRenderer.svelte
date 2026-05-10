<script lang="ts">
	import { untrack } from "svelte";
	import type { SchemaDefinition, SchemaValues } from "../core/types";
	import { getFieldComponent } from "./field-registry";
	import {
		applySchemaFieldUpdate,
		buildSchemaRenderItems,
		createSchemaInitialValues,
		resolveSchemaRendererI18nContext
	} from "./schema-renderer-i18n";

	interface Props {
		schema: SchemaDefinition;
		locales?: string[];
		defaultLocale?: string;
		editingLocale?: string;
		onValuesChange?: (values: SchemaValues) => void;
	}

	const props: Props = $props();

	function createInitialValues(componentProps: Props): SchemaValues {
		const context = resolveSchemaRendererI18nContext({
			locales: componentProps.locales,
			defaultLocale: componentProps.defaultLocale,
			editingLocale: componentProps.editingLocale
		});

		return createSchemaInitialValues(componentProps.schema, context.defaultLocale);
	}

	const initialValues = untrack(() =>
		createInitialValues({
			schema: props.schema,
			locales: props.locales,
			defaultLocale: props.defaultLocale,
			editingLocale: props.editingLocale
		})
	);
	let values = $state<SchemaValues>(initialValues);
	const i18nContext = $derived(
		resolveSchemaRendererI18nContext({
			locales: props.locales,
			defaultLocale: props.defaultLocale,
			editingLocale: props.editingLocale
		})
	);
	const renderItems = $derived(buildSchemaRenderItems(props.schema, values, i18nContext));

	queueMicrotask(() => {
		props.onValuesChange?.({ ...values });
	});

	function updateValue(fieldName: string, fieldLocale: string, nextValue: string) {
		values = applySchemaFieldUpdate(
			props.schema,
			values,
			fieldName,
			fieldLocale,
			nextValue,
			i18nContext
		);

		props.onValuesChange?.({ ...values });
	}
</script>

<div class="space-y-4">
	{#each renderItems as item (item.localizedField.name)}
		{@const FieldComponent = getFieldComponent(item.sourceField.type)}
		{#if FieldComponent}
			<FieldComponent
				field={item.localizedField}
				value={item.value}
				onValueChange={(nextValue: string) => updateValue(item.sourceField.name, item.locale, nextValue)}
			/>
		{/if}
	{/each}
</div>
