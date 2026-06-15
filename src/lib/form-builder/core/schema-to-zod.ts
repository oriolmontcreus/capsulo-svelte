import { z } from "zod";
import type { SchemaDefinition } from "./types";
import { textFieldToZod } from "../fields/TextField/text-field.zod";
import { textareaFieldToZod } from "../fields/TextareaField/textarea-field.zod";
import { richEditorFieldToZod } from "../fields/RichEditorField/rich-editor-field.zod";
import { toggleFieldToZod } from "../fields/ToggleField/toggle-field.zod";
import { selectFieldToZod } from "../fields/SelectField/select-field.zod";
import { colorPickerFieldToZod } from "../fields/ColorPickerField/color-picker-field.zod";
import { fileUploadFieldToZod } from "../fields/FileUploadField/file-upload-field.zod";
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
			case "textarea":
				shape[field.name] = textareaFieldToZod(field, defaultLocale);
				break;
			case "rich-editor":
				shape[field.name] = richEditorFieldToZod(field, defaultLocale);
				break;
			case "toggle":
				shape[field.name] = toggleFieldToZod(field);
				break;
			case "select":
				shape[field.name] = selectFieldToZod(field, defaultLocale);
				break;
			case "colorpicker":
				shape[field.name] = colorPickerFieldToZod(field, defaultLocale);
				break;
			case "file-upload":
				shape[field.name] = fileUploadFieldToZod(field, defaultLocale);
				break;
			default:
				break;
		}
	}

	return z.object(shape);
}
