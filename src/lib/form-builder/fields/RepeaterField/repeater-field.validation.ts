import type { FieldValidator } from "../../core/validation";
import { fieldLabel } from "../../core/validation-helpers";
import type { RepeaterFieldDefinition } from "./repeater-field.types";

function itemNoun(field: RepeaterFieldDefinition, count: number): string {
	if (count === 1) return field.itemName?.toLowerCase() ?? "item";
	return field.itemPluralName?.toLowerCase() ?? (field.itemName ? `${field.itemName.toLowerCase()}s` : "items");
}

/** Checks the item count only; `validateSchemaValues` validates each item's fields. */
export const repeaterFieldValidator: FieldValidator<RepeaterFieldDefinition> = {
	isEmpty: (_field, value) => !Array.isArray(value) || value.length === 0,
	requiredMessage: (field) => `${fieldLabel(field)} needs at least one ${itemNoun(field, 1)}.`,
	// Count limits apply even when the list is empty, so `minItems` works without `required`.
	alwaysValidate: true,
	validate(field, value) {
		const label = fieldLabel(field);
		const count = Array.isArray(value) ? value.length : 0;
		if (field.minItems && count < field.minItems) {
			return `${label} needs at least ${field.minItems} ${itemNoun(field, field.minItems)} (has ${count}).`;
		}
		if (field.maxItems !== undefined && count > field.maxItems) {
			return `${label} allows at most ${field.maxItems} ${itemNoun(field, field.maxItems)} (has ${count}).`;
		}
		return null;
	},
};
