import type { FieldDefinition } from "../../core/types";

/** Password-type Text fields: their values are masked in diffs and kept away from the AI agent. */
export function isPasswordField(field: FieldDefinition | undefined): boolean {
	return field?.type === "text" && field.inputType === "password";
}

export const MASKED_VALUE = "••••••••";
