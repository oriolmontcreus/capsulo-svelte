import type { FieldValidator } from "../../core/validation";
import { fieldLabel } from "../../core/validation-helpers";
import type { ToggleFieldDefinition } from "./toggle-field.types";

/** A required toggle must be switched on (e.g. "I accept the terms"). */
export const toggleFieldValidator: FieldValidator<ToggleFieldDefinition> = {
	isEmpty: (_field, value) => value !== true,
	requiredMessage: (field) => `${fieldLabel(field)} must be turned on.`,
	validate: (field, value) => (typeof value === "boolean" ? null : `${fieldLabel(field)} must be on or off.`),
};
