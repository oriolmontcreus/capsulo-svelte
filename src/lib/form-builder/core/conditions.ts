import { resolveFieldValues } from "./translation-runtime";
import type { ConditionValues, FieldCondition, FieldDefinition, SchemaValues } from "./types";

/**
 * The values a field's `hidden`/`required` conditions receive: every sibling field resolved
 * to the default locale. Repeater values are plain item objects (`{ _id, ...fields }`).
 */
export function resolveConditionValues(
	fields: FieldDefinition[],
	values: SchemaValues,
	defaultLocale: string,
): ConditionValues {
	return resolveFieldValues(fields, values, defaultLocale, defaultLocale);
}

function evaluateCondition(
	field: FieldDefinition,
	key: "hidden" | "required",
	condition: FieldCondition | undefined,
	values: ConditionValues,
): boolean {
	if (typeof condition !== "function") return condition === true;
	try {
		return condition(values) === true;
	} catch (error) {
		// A broken condition must not take the editor down; treat it as "off" and say why.
		console.error(`[capsulo] The ${key}() condition of field "${field.name}" threw:`, error);
		return false;
	}
}

export function isFieldHidden(field: FieldDefinition, values: ConditionValues): boolean {
	return evaluateCondition(field, "hidden", field.hidden, values);
}

export function isFieldRequired(field: FieldDefinition, values: ConditionValues): boolean {
	return evaluateCondition(field, "required", field.required, values);
}
