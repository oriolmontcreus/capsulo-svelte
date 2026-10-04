import type { FieldValidator } from "../../core/validation";
import { fieldLabel } from "../../core/validation-helpers";
import type { ToggleFieldDefinition } from "./toggle-field.types";
import { t } from "../../../admin-i18n/core";

/** A required toggle must be switched on (e.g. "I accept the terms"). */
export const toggleFieldValidator: FieldValidator<ToggleFieldDefinition> = {
	isEmpty: (_field, value) => value !== true,
	requiredMessage: (field) => t("validation.toggleRequired", { label: fieldLabel(field) }),
	validate: (field, value) =>
		typeof value === "boolean" ? null : t("validation.toggleInvalid", { label: fieldLabel(field) }),
};
