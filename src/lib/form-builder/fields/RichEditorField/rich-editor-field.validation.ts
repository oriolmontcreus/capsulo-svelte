import type { FieldValidator } from "../../core/validation";
import { checkLength, fieldLabel, htmlToPlainText } from "../../core/validation-helpers";
import type { RichEditorFieldDefinition } from "./rich-editor-field.types";

export const richEditorFieldValidator: FieldValidator<RichEditorFieldDefinition> = {
	isEmpty: (_field, value) => typeof value !== "string" || htmlToPlainText(value).length === 0,
	validate(field, value) {
		const label = fieldLabel(field);
		if (typeof value !== "string") return `${label} must be rich text.`;
		return checkLength(label, htmlToPlainText(value), field.minLength, field.maxLength);
	},
};
