import { z } from "zod";
import type { SchemaDefinition } from "./types";
import { textFieldToZod } from "../fields/TextField/text-field.zod";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";

interface SchemaToZodOptions {
	defaultLocale?: string;
}

export function schemaToZod(schema: SchemaDefinition, options: SchemaToZodOptions = {}) {
	const defaultLocale = options.defaultLocale ?? DEFAULT_LOCALE;
	const shape: Record<string, z.ZodTypeAny> = {};

	for (const field of schema.fields) {
		switch (field.type) {
			case "text":
				shape[field.name] = textFieldToZod(field, defaultLocale);
				break;
			default:
				break;
		}
	}

	return z.object(shape);
}
