<script lang="ts">
	import type { SchemaDefinition, SchemaValues } from "../core/types";
	import { getFieldComponent } from "./field-registry";
	import { LOCALES, DEFAULT_LOCALE } from "$lib/config/i18n-config";
	import {
		createInitialFieldValue,
		resolveFieldValue,
		setFieldValue
	} from "$lib/form-builder/core/translation-runtime";

	interface Props {
		schema: SchemaDefinition;
		locales?: string[];
		defaultLocale?: string;
		editingLocale?: string;
		onValuesChange?: (values: SchemaValues) => void;
	}

	const props = $props<Props>();

	function createInitialValues(definition: SchemaDefinition, defaultLocale: string): SchemaValues {
		const initialValues: SchemaValues = {};

		for (const field of definition.fields) {
			initialValues[field.name] = createInitialFieldValue(field, defaultLocale);
		}

		return initialValues;
	}

	function resolveInitialDefaultLocale(componentProps: Props): string {
		const trimmedLocales =
			componentProps.locales?.map((locale) => locale.trim()).filter((locale) => locale.length > 0) ?? [];
		const locales = trimmedLocales.length ? trimmedLocales : LOCALES;
		const configuredDefaultLocale =
			componentProps.defaultLocale?.trim() && componentProps.defaultLocale.trim().length > 0
				? componentProps.defaultLocale.trim()
				: DEFAULT_LOCALE;

		return locales.includes(configuredDefaultLocale) ? configuredDefaultLocale : (locales[0] ?? DEFAULT_LOCALE);
	}

	const resolvedLocales = $derived.by(() => {
		const trimmedLocales =
			props.locales?.map((locale) => locale.trim()).filter((locale) => locale.length > 0) ?? [];
		return trimmedLocales.length ? trimmedLocales : LOCALES;
	});
	const resolvedDefaultLocale = $derived(
		props.defaultLocale?.trim() && props.defaultLocale.trim().length > 0
			? props.defaultLocale.trim()
			: DEFAULT_LOCALE
	);
	const effectiveDefaultLocale = $derived(
		resolvedLocales.includes(resolvedDefaultLocale) ? resolvedDefaultLocale : (resolvedLocales[0] ?? DEFAULT_LOCALE)
	);
	const effectiveEditingLocale = $derived(
		props.editingLocale?.trim() && props.editingLocale.trim().length > 0
			? props.editingLocale.trim()
			: effectiveDefaultLocale
	);

	let values = $state<SchemaValues>(
		createInitialValues(props.schema, resolveInitialDefaultLocale(props))
	);

	queueMicrotask(() => {
		props.onValuesChange?.({ ...values });
	});

	function updateValue(fieldName: string, fieldLocale: string, nextValue: string) {
		const field = props.schema.fields.find((item) => item.name === fieldName);
		if (!field) {
			return;
		}

		values = {
			...values,
			[fieldName]: setFieldValue(
				field,
				values[fieldName],
				nextValue,
				field.translatable ? fieldLocale : effectiveEditingLocale,
				effectiveDefaultLocale
			)
		};

		props.onValuesChange?.({ ...values });
	}
</script>

<div class="space-y-4">
	{#each props.schema.fields as field (field.name)}
		{#if field.type === "text"}
			{@const FieldComponent = getFieldComponent(field.type)}
			{#if FieldComponent}
				{@const fieldLocales = field.translatable ? resolvedLocales : [effectiveDefaultLocale]}
				{#each fieldLocales as locale (`${field.name}-${locale}`)}
					{@const localizedField = {
						...field,
						name: `${field.name}-${locale}`,
						label:
							field.translatable && fieldLocales.length > 1
								? `${field.label ?? field.name} (${locale})`
								: (field.label ?? field.name)
					}}
					{@const localizedValue = resolveFieldValue(
						field,
						values[field.name],
						locale,
						effectiveDefaultLocale
					)}
					<FieldComponent
						field={localizedField}
						value={typeof localizedValue === "string" ? localizedValue : ""}
						onValueChange={(nextValue) => updateValue(field.name, locale, nextValue)}
					/>
				{/each}
			{/if}
		{/if}
	{/each}
</div>
