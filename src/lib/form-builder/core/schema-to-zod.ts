import { z } from "zod";
import type { SchemaDefinition } from "./types";
import { textFieldToZod } from "../fields/TextField/text-field.zod";

export function schemaToZod(schema: SchemaDefinition) {
	const shape: Record<string, z.ZodTypeAny> = {};

	for (const field of schema.fields) {
		switch (field.type) {
			case "text":
				shape[field.name] = textFieldToZod(field);
				break;
			default:
				break;
		}
	}

	return z.object(shape);
}
