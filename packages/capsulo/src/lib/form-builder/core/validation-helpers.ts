import type { FieldDefinition } from "./types";
import { t } from "$lib/admin-i18n/core";

/** Same tokens the editors highlight and the site replaces: `{{key}}`. */
const VARIABLE_TOKEN_PATTERN = /\{\{\s*[^{}]+?\s*\}\}/;

export function fieldLabel(field: FieldDefinition): string {
	return field.label ?? field.name;
}

export function isBlankString(value: unknown): boolean {
	return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

export function containsVariableToken(value: string): boolean {
	return VARIABLE_TOKEN_PATTERN.test(value);
}

export function checkLength(
	label: string,
	text: string,
	minLength: number | undefined,
	maxLength: number | undefined,
): string | null {
	// Count characters the way people do (an emoji is one), not UTF-16 code units.
	const length = Array.from(text).length;
	if (minLength !== undefined && length < minLength) {
		return t("validation.minLength", { label, min: minLength, length });
	}
	if (maxLength !== undefined && length > maxLength) {
		return t("validation.maxLength", { label, max: maxLength, length });
	}
	return null;
}

/** The whole value must match: `regex("[a-z-]+")` rejects "abc!" even though "abc" matches. */
export function checkPattern(label: string, text: string, pattern: string | RegExp | undefined): string | null {
	if (pattern === undefined) return null;
	const source = typeof pattern === "string" ? pattern : pattern.source;
	const flags = typeof pattern === "string" ? "" : pattern.flags.replace(/[gy]/g, "");
	const anchored = new RegExp(`^(?:${source})$`, flags);
	return anchored.test(text) ? null : t("validation.invalidFormat", { label });
}

/**
 * Visible text of stored rich-text HTML, for "required" and length checks.
 * A TipTap empty document is "<p></p>", which has no visible text.
 */
export function htmlToPlainText(html: string): string {
	return html
		.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
		.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&(amp|lt|gt|quot|#39);/gi, "x")
		.replace(/ /g, " ")
		.replace(/\s+/g, " ")
		.trim();
}
