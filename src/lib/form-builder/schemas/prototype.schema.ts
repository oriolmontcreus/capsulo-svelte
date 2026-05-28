import { createSchema } from "../core/create-schema";
import type { FieldDefinition } from "../core/types";
import { Text } from "../fields/TextField/text-field.builder";
import { RichEditor } from "../fields/RichEditorField/rich-editor-field.builder";

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
			.translatable()
	]
});
