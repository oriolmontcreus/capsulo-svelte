import type { SchemaDefinition } from "$lib/form-builder/core/types";

/**
 * Capsule schemas by key, loaded without the capsule components. The Worker API validates
 * content with these, so it doesn't bundle every capsule's UI. (The admin uses `registry.ts`.)
 */
const schemaModules = import.meta.glob<Record<string, unknown>>(
	"../../../components/capsules/**/*.schema.ts",
	{ eager: true }
);

function isSchemaDefinition(value: unknown): value is SchemaDefinition {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as SchemaDefinition).key === "string" &&
		Array.isArray((value as SchemaDefinition).fields)
	);
}

const schemasByKey = new Map<string, SchemaDefinition>();
for (const module of Object.values(schemaModules)) {
	for (const exported of Object.values(module)) {
		if (isSchemaDefinition(exported)) schemasByKey.set(exported.key, exported);
	}
}

export function getCapsuleSchemaByKey(key: string): SchemaDefinition | undefined {
	return schemasByKey.get(key);
}
