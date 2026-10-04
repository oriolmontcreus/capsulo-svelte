import type { FieldValidator } from "../../core/validation";
import { fieldLabel } from "../../core/validation-helpers";
import type { RepeaterFieldDefinition } from "./repeater-field.types";
import { t } from "$lib/admin-i18n/core";

function itemNoun(field: RepeaterFieldDefinition, count: number): string {
	if (count === 1) return field.itemName?.toLowerCase() ?? t("repeater.defaultItemNameLower");
	return (
		field.itemPluralName?.toLowerCase() ??
		(field.itemName ? `${field.itemName.toLowerCase()}s` : t("repeater.defaultItemPluralLower"))
	);
}

/** Checks the item count only; `validateSchemaValues` validates each item's fields. */
export const repeaterFieldValidator: FieldValidator<RepeaterFieldDefinition> = {
	isEmpty: (_field, value) => !Array.isArray(value) || value.length === 0,
	requiredMessage: (field) => t("validation.repeaterRequired", { label: fieldLabel(field), item: itemNoun(field, 1) }),
	// Count limits apply even when the list is empty, so `minItems` works without `required`.
	alwaysValidate: true,
	validate(field, value) {
		const label = fieldLabel(field);
		const count = Array.isArray(value) ? value.length : 0;
		if (field.minItems && count < field.minItems) {
			return t("validation.repeaterMin", { label, min: field.minItems, items: itemNoun(field, field.minItems), count });
		}
		if (field.maxItems !== undefined && count > field.maxItems) {
			return t("validation.repeaterMax", { label, max: field.maxItems, items: itemNoun(field, field.maxItems), count });
		}
		return null;
	},
};
