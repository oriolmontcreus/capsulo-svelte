import { createSchema } from "../core/create-schema";
import { TextField } from "../fields/TextField/text-field.builder";

export const prototypeSchema = createSchema({
	name: "Prototype Schema",
	key: "prototype-schema",
	description: "Minimal schema with one text field",
	fields: [
		TextField("title")
			.label("Title")
			.description("The main title used by the prototype")
			.placeholder("Write a title...")
			.required()
	]
});
