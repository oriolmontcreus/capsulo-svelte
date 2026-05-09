<script lang="ts">
	import type { SchemaDefinition, SchemaValues } from "../core/types";
	import { getFieldComponent } from "./field-registry";

	interface Props {
		schema: SchemaDefinition;
		onValuesChange?: (values: SchemaValues) => void;
	}

	const props = $props<Props>();

	function createInitialValues(definition: SchemaDefinition): SchemaValues {
		const initialValues: SchemaValues = {};

		for (const field of definition.fields) {
			initialValues[field.name] = field.type === "text" ? field.defaultValue ?? "" : "";
		}

		return initialValues;
	}

	let values = $state<SchemaValues>(createInitialValues(props.schema));

	queueMicrotask(() => {
		props.onValuesChange?.({ ...values });
	});

	function updateValue(fieldName: string, nextValue: string) {
		values = {
			...values,
			[fieldName]: nextValue
		};

		props.onValuesChange?.({ ...values });
	}
</script>

<div class="space-y-4">
	{#each props.schema.fields as field (field.name)}
		{#if field.type === "text"}
			{@const FieldComponent = getFieldComponent(field.type)}
			{#if FieldComponent}
				<FieldComponent
					field={field}
					value={values[field.name] ?? ""}
					onValueChange={(nextValue) => updateValue(field.name, nextValue)}
				/>
			{/if}
		{/if}
	{/each}
</div>
