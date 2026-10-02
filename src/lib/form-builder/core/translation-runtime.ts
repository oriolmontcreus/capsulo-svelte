import { getSelectInitialValue } from "../fields/SelectField/modules/select-value";
import type {
	FieldDefinition,
	LocalizedFieldValue,
	RepeaterFieldDefinition,
	RepeaterItem,
	ResolvedSchemaValues,
	SchemaDefinition,
	SchemaValues,
	SelectFieldDefinition,
} from "./types";

function normalizeLocale(locale: string): string {
	return locale.trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Builds one repeater item: every child field gets its initial locale map, or the `seed`
 * value (a plain value, written to the default locale) when one is given. Nested repeater
 * items get ids derived from `id`, so the same seed always produces the same item.
 */
export function createRepeaterItem(
	field: RepeaterFieldDefinition,
	defaultLocale: string,
	id: string,
	seed?: Record<string, unknown>
): RepeaterItem {
	const locale = normalizeLocale(defaultLocale);
	const item: RepeaterItem = { _id: id };

	for (const child of field.fields) {
		const seedValue = seed?.[child.name];
		if (seedValue === undefined) {
			item[child.name] =
				child.type === "repeater"
					? { [locale]: createRepeaterItems(child, locale, (index) => `${id}-${child.name}-${index}`) }
					: createInitialFieldValue(child, locale);
		} else if (child.type === "repeater") {
			const seeds = Array.isArray(seedValue) ? seedValue.filter(isPlainObject) : [];
			item[child.name] = {
				[locale]: seeds.map((childSeed, index) =>
					createRepeaterItem(child, locale, `${id}-${child.name}-${index}`, childSeed)
				),
			};
		} else {
			item[child.name] = { [locale]: seedValue };
		}
	}

	return item;
}

/** The repeater's initial items: its `defaultValue`, padded with empty items up to `minItems`. */
function createRepeaterItems(
	field: RepeaterFieldDefinition,
	defaultLocale: string,
	idForIndex: (index: number) => string
): RepeaterItem[] {
	const seeds = field.defaultValue ?? [];
	const count = Math.max(seeds.length, field.minItems ?? 0);
	return Array.from({ length: count }, (_, index) =>
		createRepeaterItem(field, defaultLocale, idForIndex(index), seeds[index])
	);
}

/** Stored repeater value as a clean item list: anything that isn't an item object is dropped. */
export function normalizeRepeaterItems(value: unknown): RepeaterItem[] {
	if (!Array.isArray(value)) return [];
	return value.filter(isPlainObject).map((item, index) =>
		typeof item._id === "string" && item._id ? (item as RepeaterItem) : { ...item, _id: `item-${index}` }
	);
}

/** The item's field values without its id, ready for the schema helpers. */
export function repeaterItemValues(item: RepeaterItem): SchemaValues {
	const { _id, ...values } = item;
	return values as SchemaValues;
}

export function createInitialFieldValue(
	field: FieldDefinition,
	defaultLocale: string
): LocalizedFieldValue<unknown> {
	const normalizedDefaultLocale = normalizeLocale(defaultLocale);
	const seedValue =
		field.type === "select"
			? getSelectInitialValue(field as SelectFieldDefinition)
			: field.type === "file-upload"
				? (field.defaultValue ?? [])
				: field.type === "text" || field.type === "textarea" || field.type === "rich-editor" || field.type === "colorpicker"
					? (field.defaultValue ?? "")
					: field.type === "toggle"
						? (field.defaultValue ?? false)
						: field.type === "repeater"
							? createRepeaterItems(field, normalizedDefaultLocale, (index) => `${field.name}-default-${index}`)
							: "";

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

/** Resolves one field for a locale; repeater items are resolved field by field, recursively. */
function resolveValue(
	field: FieldDefinition,
	localizedValue: LocalizedFieldValue<unknown> | undefined,
	targetLocale: string,
	defaultLocale: string
): unknown | undefined {
	const value = resolveFieldValue(field, localizedValue, targetLocale, defaultLocale);
	if (field.type !== "repeater") return value;

	return normalizeRepeaterItems(value).map((item) => ({
		_id: item._id,
		...resolveFieldValues(field.fields, repeaterItemValues(item), targetLocale, defaultLocale)
	}));
}

function resolveFieldValues(
	fields: FieldDefinition[],
	values: SchemaValues,
	targetLocale: string,
	defaultLocale: string
): ResolvedSchemaValues {
	const resolved: ResolvedSchemaValues = {};

	for (const field of fields) {
		resolved[field.name] = resolveValue(field, values[field.name], targetLocale, defaultLocale);
	}

	return resolved;
}

export function resolveSchemaValues(
	schema: SchemaDefinition,
	values: SchemaValues,
	targetLocale: string,
	defaultLocale: string
): ResolvedSchemaValues {
	return resolveFieldValues(schema.fields, values, targetLocale, defaultLocale);
}

export function getSchemaDefaultValues(
	schema: SchemaDefinition,
	locale: string,
	defaultLocale: string
): ResolvedSchemaValues {
	const resolved: ResolvedSchemaValues = {};

	for (const field of schema.fields) {
		const defaultValue =
			field.type === "text" || field.type === "textarea" || field.type === "rich-editor"
				? (field.defaultValue ?? "")
				: field.type === "repeater"
					? resolveValue(field, createInitialFieldValue(field, defaultLocale), locale, defaultLocale)
					: "";
		resolved[field.name] = defaultValue;
	}

	return resolved;
}
