import { z } from "zod";
import type { FieldDefinition, SchemaDefinition } from "./types";
import { textFieldToZod } from "../fields/TextField/text-field.zod";
import { textareaFieldToZod } from "../fields/TextareaField/textarea-field.zod";
import { richEditorFieldToZod } from "../fields/RichEditorField/rich-editor-field.zod";
import { toggleFieldToZod } from "../fields/ToggleField/toggle-field.zod";
import { selectFieldToZod } from "../fields/SelectField/select-field.zod";
import { colorPickerFieldToZod } from "../fields/ColorPickerField/color-picker-field.zod";
import { fileUploadFieldToZod } from "../fields/FileUploadField/file-upload-field.zod";
import { repeaterFieldToZod } from "../fields/RepeaterField/repeater-field.zod";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";

interface SchemaToZodOptions {
	defaultLocale?: string;
}

function fieldToZod(field: FieldDefinition, defaultLocale: string): z.ZodTypeAny | undefined {
	switch (field.type) {
		case "text":
			return textFieldToZod(field, defaultLocale);
		case "textarea":
			return textareaFieldToZod(field, defaultLocale);
		case "rich-editor":
			return richEditorFieldToZod(field, defaultLocale);
		case "toggle":
			return toggleFieldToZod(field);
		case "select":
			return selectFieldToZod(field, defaultLocale);
		case "colorpicker":
			return colorPickerFieldToZod(field, defaultLocale);
		case "file-upload":
			return fileUploadFieldToZod(field, defaultLocale);
		case "repeater":
			return repeaterFieldToZod(field, (child) => fieldToZod(child, defaultLocale));
		default:
			return undefined;
	}
}

export function schemaToZod(schema: SchemaDefinition, options: SchemaToZodOptions = {}) {
	const defaultLocale = options.defaultLocale ?? DEFAULT_LOCALE;
	const shape: Record<string, z.ZodTypeAny> = {};

	for (const field of schema.fields) {
		const fieldSchema = fieldToZod(field, defaultLocale);
		if (fieldSchema) shape[field.name] = fieldSchema;
	}

	return z.object(shape);
}
