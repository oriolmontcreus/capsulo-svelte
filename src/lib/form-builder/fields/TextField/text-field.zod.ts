import { z } from "zod";
import type { TextFieldDefinition } from "./text-field.types";

export function textFieldToZod(field: TextFieldDefinition, defaultLocale: string) {
	const base = z.record(z.string(), z.string());

	if (!field.required) {
		return base;
	}

	return base.refine(
		(valueByLocale) => {
			const defaultValue = valueByLocale[defaultLocale];
			return typeof defaultValue === "string" && defaultValue.trim().length > 0;
		},
		{
			message: `${field.label ?? field.name} is required in ${defaultLocale}`
		}
	);
}
