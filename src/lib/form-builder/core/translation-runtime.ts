import type {
	FieldDefinition,
	LocalizedFieldValue,
	ResolvedSchemaValues,
	SchemaDefinition,
	SchemaValues
} from "./types";

function normalizeLocale(locale: string): string {
	return locale.trim();
}

export function createInitialFieldValue(
	field: FieldDefinition,
	defaultLocale: string
): LocalizedFieldValue<unknown> {
	const normalizedDefaultLocale = normalizeLocale(defaultLocale);
	const seedValue = field.type === "text" || field.type === "textarea" ? (field.defaultValue ?? "") : "";

	return {
		[normalizedDefaultLocale]: seedValue
	};
}

export function resolveFieldValue(
	field: FieldDefinition,
	localizedValue: LocalizedFieldValue<unknown> | undefined,
	targetLocale: string,
	defaultLocale: string
): unknown | undefined {
	const normalizedDefaultLocale = normalizeLocale(defaultLocale);
	const normalizedTargetLocale = normalizeLocale(targetLocale);
	const valueByLocale = localizedValue ?? {};

	const forcedLocale = field.translatable ? normalizedTargetLocale : normalizedDefaultLocale;
	return valueByLocale[forcedLocale] ?? valueByLocale[normalizedDefaultLocale];
}

export function setFieldValue(
	field: FieldDefinition,
	previousValue: LocalizedFieldValue<unknown> | undefined,
	nextValue: unknown,
	editingLocale: string,
	defaultLocale: string
): LocalizedFieldValue<unknown> {
	const normalizedDefaultLocale = normalizeLocale(defaultLocale);
	const normalizedEditingLocale = normalizeLocale(editingLocale);
	const localeToWrite = field.translatable ? normalizedEditingLocale : normalizedDefaultLocale;
	const nextLocalizedValue: LocalizedFieldValue<unknown> = {
		...(previousValue ?? {})
	};

	nextLocalizedValue[localeToWrite] = nextValue;

	if (!field.translatable) {
		return {
			[normalizedDefaultLocale]: nextLocalizedValue[normalizedDefaultLocale] ?? nextValue
		};
	}

	return nextLocalizedValue;
}

export function resolveSchemaValues(
	schema: SchemaDefinition,
	values: SchemaValues,
	targetLocale: string,
	defaultLocale: string
): ResolvedSchemaValues {
	const resolved: ResolvedSchemaValues = {};

	for (const field of schema.fields) {
		resolved[field.name] = resolveFieldValue(
			field,
			values[field.name],
			targetLocale,
			defaultLocale
		);
	}

	return resolved;
}

export function getSchemaDefaultValues(
	schema: SchemaDefinition,
	locale: string,
	defaultLocale: string
): ResolvedSchemaValues {
	const resolved: ResolvedSchemaValues = {};

	for (const field of schema.fields) {
		const defaultValue =
			field.type === "text" || field.type === "textarea" ? (field.defaultValue ?? "") : "";
		resolved[field.name] = defaultValue;
	}

	return resolved;
}
