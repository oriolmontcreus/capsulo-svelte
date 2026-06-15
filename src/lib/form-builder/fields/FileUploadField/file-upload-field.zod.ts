import { z } from "zod";
import type { FileUploadFieldDefinition } from "./file-upload-field.types";

export function fileUploadFieldToZod(
	field: FileUploadFieldDefinition,
	defaultLocale: string,
) {
	const base = z.record(z.string(), z.array(z.string()));

	if (!field.required) return base;

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
