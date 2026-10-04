import type { SchemaValues } from "$lib/form-builder/core/types";

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

export type PageEditorCachedDocument = {
	pageId: string;
	/** Current local draft values (auto-synced on every edit). */
	valuesByInstance: PageEditorValuesByInstance;
	/** Last committed (remote) values; the "old" side of the changes diff. */
	baselineValuesByInstance: PageEditorValuesByInstance;
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
