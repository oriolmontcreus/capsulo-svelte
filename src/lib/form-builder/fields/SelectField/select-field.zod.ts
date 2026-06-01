import { z } from "zod";
import type { SelectFieldDefinition } from "./select-field.types";

export function selectFieldToZod(field: SelectFieldDefinition, defaultLocale: string) {
	if (field.multiple) {
		const base = z.record(z.string(), z.array(z.string()));

		if (!field.required) {
			return base;
		}

		return base.refine(
			(valueByLocale) => {
				const defaultValue = valueByLocale[defaultLocale];
				return Array.isArray(defaultValue) && defaultValue.length > 0;
			},
			{
				message: `${field.label ?? field.name} is required in ${defaultLocale}`,
			},
		);
	}

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
			message: `${field.label ?? field.name} is required in ${defaultLocale}`,
		},
	);
}
