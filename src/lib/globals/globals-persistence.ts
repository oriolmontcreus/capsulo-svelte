import type { SchemaValues } from "$lib/form-builder/core/types";

export const GLOBALS_CONTENT_FORMAT_VERSION = 1;
export const GLOBALS_DOCUMENT_ID = "globals";

export type GlobalsPersistedContentV1 = {
	formatVersion: 1;
	values: SchemaValues;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function serializeGlobalsValues(values: SchemaValues): GlobalsPersistedContentV1 {
	return {
		formatVersion: GLOBALS_CONTENT_FORMAT_VERSION,
		values
	};
}

export function deserializeGlobalsValues(content: unknown): SchemaValues {
	if (
		isRecord(content) &&
		content.formatVersion === GLOBALS_CONTENT_FORMAT_VERSION &&
		isRecord(content.values)
	) {
		return content.values as SchemaValues;
	}

	return {};
}
