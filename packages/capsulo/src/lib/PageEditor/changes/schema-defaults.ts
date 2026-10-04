import { getCapsuleByKey } from "$lib/capsules/core/registry";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import type { SchemaValues } from "$lib/form-builder/core/types";
import { createSchemaInitialValues } from "$lib/form-builder/renderer/schema-renderer-i18n";

/** Strips the numeric suffix from an instance id ("test-capsule-01" -> "test-capsule"). */
export function capsuleKeyFromInstanceId(instanceId: string): string {
	return instanceId.replace(/-\d+$/, "");
}

/**
 * Returns the values the editor seeds for an instance's fields when they are
 * missing from stored content, so the diff doesn't report "missing -> default"
 * as a change.
 */
export function resolveInstanceDefaults(instanceId: string): SchemaValues | undefined {
	const capsule = getCapsuleByKey(capsuleKeyFromInstanceId(instanceId));
	if (!capsule) return undefined;
	return createSchemaInitialValues(capsule.schema, DEFAULT_LOCALE);
}
