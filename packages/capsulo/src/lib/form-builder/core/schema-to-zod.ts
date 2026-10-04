import { z } from "zod";
import type { SchemaDefinition, SchemaValues } from "./types";
import { validateSchemaValues } from "./validation";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";

interface SchemaToZodOptions {
	defaultLocale?: string;
	locales?: string[];
}

/**
 * Zod view of `validateSchemaValues`, for code that wants a Zod schema. Each issue is reported
 * at its field path (repeater item ids included), with the locale appended.
 */
export function schemaToZod(schema: SchemaDefinition, options: SchemaToZodOptions = {}) {
	const defaultLocale = options.defaultLocale ?? DEFAULT_LOCALE;

	return z.record(z.string(), z.record(z.string(), z.unknown())).superRefine((values, context) => {
		const issues = validateSchemaValues(schema, values as SchemaValues, { defaultLocale, locales: options.locales });
		for (const issue of issues) {
			context.addIssue({ code: "custom", path: [...issue.path, issue.locale], message: issue.message });
		}
	});
}
