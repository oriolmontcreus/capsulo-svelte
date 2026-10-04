import type { FieldValidator } from "../../core/validation";
import { checkLength, checkPattern, containsVariableToken, fieldLabel, isBlankString } from "../../core/validation-helpers";
import type { TextareaFieldDefinition } from "./textarea-field.types";
import { t } from "$lib/admin-i18n/core";

export const textareaFieldValidator: FieldValidator<TextareaFieldDefinition> = {
	isEmpty: (_field, value) => isBlankString(value),
	validate(field, value) {
		const label = fieldLabel(field);
		if (typeof value !== "string") return t("validation.notText", { label });
		const lengthError = checkLength(label, value, field.minLength, field.maxLength);
		if (lengthError) return lengthError;
		if (containsVariableToken(value)) return null;
		return checkPattern(label, value, field.regex);
	},
};
