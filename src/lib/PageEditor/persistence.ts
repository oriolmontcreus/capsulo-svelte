import type { SchemaValues } from "$lib/form-builder/core/types";

export const PAGE_EDITOR_CONTENT_FORMAT_VERSION = 1;

export type PageEditorValuesByInstance = Record<string, SchemaValues>;

export type PageEditorInstance = {
	id: string;
	values: SchemaValues;
};

export type PageEditorPersistedContentV1 = {
	formatVersion: 1;
	instances: PageEditorInstance[];
};

export type PageEditorPersistedContent = PageEditorPersistedContentV1;

export type PageEditorDocumentRow = {
	page_id: string;
	content: PageEditorPersistedContent;
	content_format_version: number;
	created_by: string | null;
	updated_by: string | null;
	created_at: string;
	updated_at: string;
};

export type PageEditorCachedDocument = {
	pageId: string;
	valuesByInstance: PageEditorValuesByInstance;
	updatedAt: string | null;
	cachedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function serializePageEditorValues(
	valuesByInstance: PageEditorValuesByInstance
): PageEditorPersistedContentV1 {
	return {
		formatVersion: 1,
		instances: Object.entries(valuesByInstance).map(([id, values]) => ({ id, values }))
	};
}

export function deserializePageEditorValues(content: unknown): PageEditorValuesByInstance {
	if (
		isRecord(content) &&
		content.formatVersion === 1 &&
		Array.isArray(content.instances)
	) {
		const nextValuesByInstance: PageEditorValuesByInstance = {};
		for (const entry of content.instances) {
			if (!isRecord(entry)) continue;
			if (typeof entry.id !== "string") continue;
			if (!isRecord(entry.values)) continue;
			nextValuesByInstance[entry.id] = entry.values as SchemaValues;
		}
		return nextValuesByInstance;
	}

	return {};
}
