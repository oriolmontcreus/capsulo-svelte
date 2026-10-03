import type { FieldValidator } from "../../core/validation";
import { fieldLabel } from "../../core/validation-helpers";
import type { FileUploadFieldDefinition } from "./file-upload-field.types";

export const fileUploadFieldValidator: FieldValidator<FileUploadFieldDefinition> = {
	isEmpty: (_field, value) => !Array.isArray(value) || value.length === 0,
	requiredMessage: (field) => `${fieldLabel(field)} needs a file.`,
	validate(field, value) {
		const label = fieldLabel(field);
		if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return `${label} has an invalid value.`;
		const maxFiles = field.multiple ? field.maxFiles : 1;
		if (maxFiles !== undefined && value.length > maxFiles) {
			return `${label} allows at most ${maxFiles} file${maxFiles === 1 ? "" : "s"} (has ${value.length}).`;
		}
		return null;
	},
};
