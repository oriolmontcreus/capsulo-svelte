import { z } from "zod";
import type { TextFieldDefinition } from "./text-field.types";

export function textFieldToZod(field: TextFieldDefinition) {
	const base = z.string().trim();

	if (field.required) {
		return base.min(1, `${field.label ?? field.name} is required`);
	}

	return base.optional();
}
