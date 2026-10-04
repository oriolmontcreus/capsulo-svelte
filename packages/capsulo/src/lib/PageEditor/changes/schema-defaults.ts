import { globalsSchema } from "virtual:capsulo/globals-schema";
import { getCapsuleByKey } from "../../capsules/core/registry";
import { GLOBALS_INSTANCE_ID } from "../../capsules/core/validate-content";
import { DEFAULT_LOCALE } from "../../config/i18n-config";
import type { SchemaDefinition, SchemaValues } from "../../form-builder/core/types";
import { createSchemaInitialValues } from "../../form-builder/renderer/schema-renderer-i18n";
import { t } from "../../admin-i18n/i18n.svelte";

/** Strips the numeric suffix from an instance id ("test-capsule-01" -> "test-capsule"). */
export function capsuleKeyFromInstanceId(instanceId: string): string {
	return instanceId.replace(/-\d+$/, "");
}

/**
 * The schema an instance's values follow, and the title it is shown under: its capsule's,
 * or the global variables' for the globals draft.
 */
export function resolveInstanceSchema(
	instanceId: string
): { title: string; schema: SchemaDefinition } | undefined {
	if (instanceId === GLOBALS_INSTANCE_ID) return { title: t("globals.title"), schema: globalsSchema };
	const key = capsuleKeyFromInstanceId(instanceId);
	const capsule = getCapsuleByKey(key);
	if (!capsule) return undefined;
	return { title: capsule.meta?.displayName ?? capsule.schema.name ?? key, schema: capsule.schema };
}

/**
 * Returns the values the editor seeds for an instance's fields when they are
 * missing from stored content, so the diff doesn't report "missing -> default"
 * as a change.
 */
export function resolveInstanceDefaults(instanceId: string): SchemaValues | undefined {
	const resolved = resolveInstanceSchema(instanceId);
	if (!resolved) return undefined;
	return createSchemaInitialValues(resolved.schema, DEFAULT_LOCALE);
}
