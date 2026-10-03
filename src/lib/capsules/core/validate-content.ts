/**
 * Validates stored content the way the editor shows it (schema defaults filled in). Shared by
 * the admin (blocking a commit or save) and the Worker API (rejecting invalid writes), so both
 * reach the same verdict. Plain TypeScript: no Svelte, browser or Worker imports.
 */
import type { SchemaDefinition, SchemaValues } from "$lib/form-builder/core/types";
import { validateSchemaValues, type ValidationIssue } from "$lib/form-builder/core/validation";
import { withSchemaDefaults } from "$lib/form-builder/renderer/schema-renderer-i18n";
import type { PageInstance } from "./page-instances";

/** The key global variables are validated under, in place of a capsule instance id. */
export const GLOBALS_INSTANCE_ID = "globals";

export interface ContentIssue extends ValidationIssue {
	/** The capsule instance ("hero-01"), or "globals". */
	instanceId: string;
	capsuleKey: string;
}

export interface ContentValidationOptions {
	defaultLocale: string;
	locales: string[];
}

/**
 * Validates each instance a page renders. Instances whose capsule no longer exists are
 * skipped (there is nothing to check them against); content stored for instances the page
 * no longer renders is ignored, so leftover data can't block a commit invisibly.
 */
export function validatePageContent(
	instances: PageInstance[],
	valuesByInstance: Record<string, SchemaValues | undefined>,
	getSchema: (capsuleKey: string) => SchemaDefinition | undefined,
	options: ContentValidationOptions,
): ContentIssue[] {
	return instances.flatMap(({ instanceId, capsuleKey }) => {
		const schema = getSchema(capsuleKey);
		if (!schema) return [];
		const values = withSchemaDefaults(schema, valuesByInstance[instanceId], options.defaultLocale);
		return validateSchemaValues(schema, values, options).map((issue) => ({ ...issue, instanceId, capsuleKey }));
	});
}

export function validateGlobalsContent(
	schema: SchemaDefinition,
	values: SchemaValues | undefined,
	options: ContentValidationOptions,
): ContentIssue[] {
	const merged = withSchemaDefaults(schema, values, options.defaultLocale);
	return validateSchemaValues(schema, merged, options).map((issue) => ({
		...issue,
		instanceId: GLOBALS_INSTANCE_ID,
		capsuleKey: schema.key,
	}));
}

/** One line per issue, e.g. `hero-01 › title (en): Title is required.` (used in API errors). */
export function formatContentIssue(issue: ContentIssue, defaultLocale: string): string {
	const locale = issue.locale === defaultLocale ? "" : ` (${issue.locale})`;
	return `${issue.instanceId} › ${issue.path.join(" › ")}${locale}: ${issue.message}`;
}
