import type { FieldValidator } from "../../core/validation";
import { fieldLabel } from "../../core/validation-helpers";
import type { FileUploadFieldDefinition } from "./file-upload-field.types";
import { t } from "$lib/admin-i18n/core";

export const fileUploadFieldValidator: FieldValidator<FileUploadFieldDefinition> = {
	isEmpty: (_field, value) => !Array.isArray(value) || value.length === 0,
	requiredMessage: (field) => t("validation.fileRequired", { label: fieldLabel(field) }),
	validate(field, value) {
		const label = fieldLabel(field);
		if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return t("validation.invalidValue", { label });
		const maxFiles = field.multiple ? field.maxFiles : 1;
		if (maxFiles !== undefined && value.length > maxFiles) {
			return t("validation.maxFiles", { label, count: maxFiles, has: value.length });
		}
		return null;
	},
};
