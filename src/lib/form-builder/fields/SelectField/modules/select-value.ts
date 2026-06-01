import type { SelectFieldDefinition, SelectOption } from "../../../core/types";

export function getSelectInitialValue(field: SelectFieldDefinition): string | string[] {
	if (field.multiple) {
		if (field.defaultValue === undefined) {
			return [];
		}
		if (Array.isArray(field.defaultValue)) {
			return [...field.defaultValue];
		}
		return field.defaultValue.length > 0 ? [field.defaultValue] : [];
	}

	if (field.defaultValue === undefined) {
		return "";
	}

	return Array.isArray(field.defaultValue) ? (field.defaultValue[0] ?? "") : field.defaultValue;
}

export function normalizeSelectValue(
	field: SelectFieldDefinition,
	raw: unknown,
): string | string[] {
	if (field.multiple) {
		if (Array.isArray(raw)) {
			return raw.filter((item): item is string => typeof item === "string");
		}
		if (typeof raw === "string" && raw.length > 0) {
			return [raw];
		}
		return [];
	}

	if (typeof raw === "string") {
		return raw;
	}

	if (Array.isArray(raw)) {
		return typeof raw[0] === "string" ? raw[0] : "";
	}

	return "";
}

export function toggleSelectValue(current: string[], optionValue: string): string[] {
	if (current.includes(optionValue)) {
		return current.filter((value) => value !== optionValue);
	}
	return [...current, optionValue];
}

export function formatSelectTriggerLabel(
	field: SelectFieldDefinition,
	values: string[],
	options: SelectOption[],
): string {
	if (values.length === 0) {
		return field.placeholder ?? "Select an option";
	}

	const labels = values
		.map((value) => options.find((option) => option.value === value)?.label ?? value)
		.filter((label) => label.length > 0);

	if (labels.length === 0) {
		return field.placeholder ?? "Select an option";
	}

	return labels.join(", ");
}
