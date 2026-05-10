import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
import {
	createInitialFieldValue,
	resolveFieldValue,
	setFieldValue
} from "$lib/form-builder/core/translation-runtime";
import type { FieldDefinition, SchemaDefinition, SchemaValues } from "../core/types";

interface SchemaRendererI18nInput {
	locales?: string[];
	defaultLocale?: string;
	editingLocale?: string;
}

export interface SchemaRendererI18nContext {
	locales: string[];
	defaultLocale: string;
	editingLocale: string;
}

export interface SchemaRenderItem {
	sourceField: FieldDefinition;
	localizedField: FieldDefinition;
	locale: string;
	value: string;
}

function normalizeLocales(locales: string[] | undefined): string[] {
	const trimmedLocales = locales?.map((locale) => locale.trim()).filter((locale) => locale.length > 0) ?? [];
	return trimmedLocales.length ? trimmedLocales : LOCALES;
}

function normalizeOptionalLocale(locale: string | undefined): string | undefined {
	const trimmedLocale = locale?.trim();
	return trimmedLocale && trimmedLocale.length > 0 ? trimmedLocale : undefined;
}

export function resolveSchemaRendererI18nContext(
	input: SchemaRendererI18nInput
): SchemaRendererI18nContext {
	const locales = normalizeLocales(input.locales);
	const configuredDefaultLocale = normalizeOptionalLocale(input.defaultLocale) ?? DEFAULT_LOCALE;
	const defaultLocale = locales.includes(configuredDefaultLocale)
		? configuredDefaultLocale
		: (locales[0] ?? DEFAULT_LOCALE);
	const editingLocale = normalizeOptionalLocale(input.editingLocale) ?? defaultLocale;

	return {
		locales,
		defaultLocale,
		editingLocale
	};
}

export function createSchemaInitialValues(
	schema: SchemaDefinition,
	defaultLocale: string
): SchemaValues {
	const initialValues: SchemaValues = {};

	for (const field of schema.fields) {
		initialValues[field.name] = createInitialFieldValue(field, defaultLocale);
	}

	return initialValues;
}

export function buildSchemaRenderItems(
	schema: SchemaDefinition,
	values: SchemaValues,
	context: SchemaRendererI18nContext
): SchemaRenderItem[] {
	const renderItems: SchemaRenderItem[] = [];

	for (const field of schema.fields) {
		if (field.type !== "text") {
			continue;
		}

		const fieldLocales = field.translatable ? context.locales : [context.defaultLocale];

		for (const locale of fieldLocales) {
			const localizedField: FieldDefinition = {
				...field,
				name: `${field.name}-${locale}`,
				label:
					field.translatable && fieldLocales.length > 1
						? `${field.label ?? field.name} (${locale})`
						: (field.label ?? field.name)
			};
			const valueByLocale = values[field.name] ?? {};
			const resolvedValue = field.translatable
				? valueByLocale[locale]
				: resolveFieldValue(field, valueByLocale, locale, context.defaultLocale);

			renderItems.push({
				sourceField: field,
				localizedField,
				locale,
				value: typeof resolvedValue === "string" ? resolvedValue : ""
			});
		}
	}

	return renderItems;
}

export function applySchemaFieldUpdate(
	schema: SchemaDefinition,
	values: SchemaValues,
	fieldName: string,
	fieldLocale: string,
	nextValue: string,
	context: SchemaRendererI18nContext
): SchemaValues {
	const field = schema.fields.find((item) => item.name === fieldName);
	if (!field) {
		return values;
	}

	const nextValues = {
		...values,
		[fieldName]: setFieldValue(
			field,
			values[fieldName],
			nextValue,
			field.translatable ? fieldLocale : context.editingLocale,
			context.defaultLocale
		)
	};

	return nextValues;
}
