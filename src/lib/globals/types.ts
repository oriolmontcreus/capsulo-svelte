import type { SchemaValues } from "$lib/form-builder/core/types";

export type GlobalsResolvedMap = Record<string, unknown>;

export type GetGlobalsOptions = {
	locale?: string;
	key?: string;
	values?: SchemaValues;
};

export function formatGlobalDisplayValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return "";
}
