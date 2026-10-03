import type { FieldValidator } from "../../core/validation";
import { checkLength, checkPattern, containsVariableToken, fieldLabel, isBlankString } from "../../core/validation-helpers";
import type { TextFieldDefinition } from "./text-field.types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Absolute URLs with a scheme (https://, mailto:, tel:) or site paths ("/about"). */
function isUrl(value: string): boolean {
	if (value.startsWith("/") && !value.startsWith("//")) return true;
	try {
		const url = new URL(value);
		return url.protocol.length > 1;
	} catch {
		return false;
	}
}

/** Floating-point safe "is `value` a multiple of `step` counted from `base`". */
function matchesStep(value: number, step: number, base: number): boolean {
	const steps = (value - base) / step;
	return Math.abs(steps - Math.round(steps)) < 1e-9;
}

function validateNumber(field: TextFieldDefinition, value: unknown): string | null {
	const label = fieldLabel(field);
	if (typeof value !== "number" || !Number.isFinite(value)) return `${label} must be a number.`;
	if (field.min !== undefined && value < field.min) return `${label} must be at least ${field.min}.`;
	if (field.max !== undefined && value > field.max) return `${label} must be at most ${field.max}.`;
	if (field.allowDecimals === false && !Number.isInteger(value)) return `${label} must be a whole number.`;
	if (field.step !== undefined && !matchesStep(value, field.step, field.min ?? 0)) {
		return `${label} must be in steps of ${field.step}${field.min ? ` from ${field.min}` : ""}.`;
	}
	return null;
}

export const textFieldValidator: FieldValidator<TextFieldDefinition> = {
	isEmpty(field, value) {
		if (field.inputType === "number") return value === null || value === undefined || value === "";
		return isBlankString(value);
	},
	validate(field, value) {
		if (field.inputType === "number") return validateNumber(field, value);

		const label = fieldLabel(field);
		if (typeof value !== "string") return `${label} must be text.`;
		const lengthError = checkLength(label, value, field.minLength, field.maxLength);
		if (lengthError) return lengthError;
		// `{{variable}}` tokens are replaced on the site, so the raw text can't be format-checked.
		if (containsVariableToken(value)) return null;
		if (field.inputType === "email" && !EMAIL_PATTERN.test(value.trim())) {
			return `${label} must be a valid email address.`;
		}
		if (field.inputType === "url" && !isUrl(value.trim())) {
			return `${label} must be a full URL (https://...) or a path starting with "/".`;
		}
		return checkPattern(label, value, field.regex);
	},
};
