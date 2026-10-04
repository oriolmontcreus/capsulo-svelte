import type { FieldDefinition, ResolvedSchemaValues, SchemaDefinition } from "../form-builder/core/types";

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

function substituteFieldValue(field: FieldDefinition, value: unknown, variables: GlobalVariableValues): unknown {
	if (field.type === "repeater") {
		if (!Array.isArray(value)) return value;
		let changed = false;
		const items = value.map((item) => {
			if (typeof item !== "object" || item === null) return item;
			const substituted = substituteFieldValues(field.fields, item as ResolvedSchemaValues, variables);
			if (substituted !== item) changed = true;
			return substituted;
		});
		return changed ? items : value;
	}
	if (!acceptsVariables(field) || typeof value !== "string") return value;
	return substituteGlobalVariables(value, variables, { html: field.type === "rich-editor" });
}

function substituteFieldValues(
	fields: FieldDefinition[],
	values: ResolvedSchemaValues,
	variables: GlobalVariableValues
): ResolvedSchemaValues {
	let next: ResolvedSchemaValues | null = null;

	for (const field of fields) {
		const value = values[field.name];
		const substituted = substituteFieldValue(field, value, variables);
		if (substituted === value) continue;

		next ??= { ...values };
		next[field.name] = substituted;
	}

	return next ?? values;
}

/**
 * Applies `substituteGlobalVariables` to every field of the schema that offers variables,
 * including the text fields inside repeater items.
 */
export function substituteSchemaVariables(
	schema: SchemaDefinition,
	values: ResolvedSchemaValues,
	variables: GlobalVariableValues
): ResolvedSchemaValues {
	return substituteFieldValues(schema.fields, values, variables);
}
