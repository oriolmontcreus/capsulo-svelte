import type { FieldValidator } from "../../core/validation";
import { fieldLabel } from "../../core/validation-helpers";
import type { SelectFieldDefinition } from "./select-field.types";

/** Values of the schema's own options; internal links are built from the site's pages at runtime. */
function staticOptionValues(field: SelectFieldDefinition): Set<string> | null {
	if (field.internalLinks) return null;
	const options = [...(field.options ?? []), ...(field.groups ?? []).flatMap((group) => group.options)];
	return new Set(options.map((option) => option.value));
}

export const selectFieldValidator: FieldValidator<SelectFieldDefinition> = {
	isEmpty: (_field, value) =>
		value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0),
	validate(field, value) {
		const label = fieldLabel(field);
		const values = Array.isArray(value) ? value : [value];
		if (!values.every((item): item is string => typeof item === "string")) return `${label} has an invalid value.`;
		if (!field.multiple && values.length > 1) return `${label} takes one option.`;

		const allowed = staticOptionValues(field);
		const unknown = allowed ? values.filter((item) => item !== "" && !allowed.has(item)) : [];
		if (unknown.length > 0) {
			return `${label} has an option that no longer exists (${unknown.map((item) => `"${item}"`).join(", ")}). Pick another one.`;
		}
		return null;
	},
};
