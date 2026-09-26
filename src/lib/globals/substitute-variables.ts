import type { FieldDefinition, ResolvedSchemaValues, SchemaDefinition } from "$lib/form-builder/core/types";

import type { GlobalVariableValues } from "./resolve-globals";

/** Same tokens the editors highlight: `{{key}}`, whitespace around the key allowed. */
const VARIABLE_TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/**
 * Replaces `{{key}}` tokens with the variable's value. Unknown keys stay as written, so a
 * typo shows up on the page instead of silently disappearing. With `html`, values are
 * escaped and their line breaks become `<br>` (Rich Editor fields store HTML).
 */
export function substituteGlobalVariables(
	text: string,
	variables: GlobalVariableValues,
	options: { html?: boolean } = {}
): string {
	if (!text.includes("{{")) return text;

	return text.replace(VARIABLE_TOKEN_PATTERN, (token, key: string) => {
		if (!Object.hasOwn(variables, key)) return token;
		const value = variables[key];
		return options.html ? escapeHtml(value).replace(/\r?\n/g, "<br>") : value;
	});
}

function acceptsVariables(field: FieldDefinition): boolean {
	return field.type === "text" || field.type === "textarea" || field.type === "rich-editor";
}

/** Applies `substituteGlobalVariables` to every field of the schema that offers variables. */
export function substituteSchemaVariables(
	schema: SchemaDefinition,
	values: ResolvedSchemaValues,
	variables: GlobalVariableValues
): ResolvedSchemaValues {
	let next: ResolvedSchemaValues | null = null;

	for (const field of schema.fields) {
		if (!acceptsVariables(field)) continue;
		const value = values[field.name];
		if (typeof value !== "string") continue;

		const substituted = substituteGlobalVariables(value, variables, { html: field.type === "rich-editor" });
		if (substituted === value) continue;

		next ??= { ...values };
		next[field.name] = substituted;
	}

	return next ?? values;
}
