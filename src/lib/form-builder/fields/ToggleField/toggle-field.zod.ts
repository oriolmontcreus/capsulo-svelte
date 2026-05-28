import { z } from "zod";
import type { ToggleFieldDefinition } from "./toggle-field.types";

export function toggleFieldToZod(field: ToggleFieldDefinition) {
	const base = z.boolean();

	if (!field.required) {
		return base;
	}

	return base.refine(
		(value) => value === true,
		{
			message: `${field.label ?? field.name} must be enabled`
		}
	);
}
