import { createSchema } from "../core/create-schema";
import type { FieldDefinition } from "../core/types";
import { Text } from "../fields/TextField/text-field.builder";
import { RichEditor } from "../fields/RichEditorField/rich-editor-field.builder";
import { Toggle } from "../fields/ToggleField/toggle-field.builder";
import { Select } from "../fields/SelectField/select-field.builder";
import { ColorPicker } from "../fields/ColorPickerField/color-picker-field.builder";

export const prototypeSchema = createSchema<FieldDefinition>({
	name: "Prototype Schema",
	key: "prototype-schema",
	description: "Minimal schema with one text field",
	fields: [
		Text("title")
			.label("Title")
			.description("The main title used by the prototype")
			.placeholder("Write a title...")
			.required()
			.translatable(),
		RichEditor("description")
			.label("Description")
			.description("Rich text description (bold/italic/underline)")
			.placeholder("Write a description...")
			.translatable(),
		Toggle("published")
			.label("Published")
			.description("Whether the content is published")
			.defaultValue(false),
		Select("category")
			.label("Category")
			.placeholder("Select a category")
			.description("The content category")
			.options([
				{ label: "Technology", value: "tech" },
				{ label: "Science", value: "science" },
				{ label: "Art", value: "art" },
				{ label: "Business", value: "business" },
			]),
		ColorPicker("accentColor")
			.label("Accent Color")
			.description("Choose the accent color for this content")
			.defaultValue("#3b82f6")
			.presetColors(["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#000000", "#ffffff"]),
		ColorPicker("backgroundColor")
			.label("Background Color")
			.description("Pick a background color with transparency support")
			.showAlpha()
			.defaultValue("#ffffff"),
		ColorPicker("themeColor")
			.label("Theme Color")
			.description("Select from predefined theme colors")
			.presetColors(["#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560"], true)
	]
});
