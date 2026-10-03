import type { FieldValidator } from "../../core/validation";
import { fieldLabel, isBlankString } from "../../core/validation-helpers";
import type { ColorPickerFieldDefinition } from "./color-picker-field.types";

export const colorPickerFieldValidator: FieldValidator<ColorPickerFieldDefinition> = {
	isEmpty: (_field, value) => isBlankString(value),
	validate(field, value) {
		const label = fieldLabel(field);
		if (typeof value !== "string") return `${label} must be a color.`;
		if (field.onlyPresets && field.presetColors?.length && !field.presetColors.includes(value.trim().toLowerCase())) {
			return `${label} must be one of the preset colors.`;
		}
		return null;
	},
};
