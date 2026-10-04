import type { FieldValidator } from "../../core/validation";
import { fieldLabel, isBlankString } from "../../core/validation-helpers";
import type { ColorPickerFieldDefinition } from "./color-picker-field.types";
import { t } from "../../../admin-i18n/core";

export const colorPickerFieldValidator: FieldValidator<ColorPickerFieldDefinition> = {
	isEmpty: (_field, value) => isBlankString(value),
	validate(field, value) {
		const label = fieldLabel(field);
		if (typeof value !== "string") return t("validation.notColor", { label });
		if (field.onlyPresets && field.presetColors?.length && !field.presetColors.includes(value.trim().toLowerCase())) {
			return t("validation.presetColor", { label });
		}
		return null;
	},
};
