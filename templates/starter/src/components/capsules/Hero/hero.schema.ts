import { createSchema, type FieldDefinition, Text, Textarea } from "capsulo/schema";

export const heroSchema = createSchema<FieldDefinition>({
	name: "Hero",
	key: "hero",
	description: "The headline at the top of a page.",
	fields: [
		Text("title")
			.label("Title")
			.required()
			.translatable()
			.defaultValue("Welcome to {{siteName}}"),
		Textarea("subtitle")
			.label("Subtitle")
			.rows(2)
			.translatable()
			.defaultValue("Edit this text in the admin at /admin."),
		Text("ctaLabel").label("Button label").translatable().defaultValue("Get in touch"),
		Text("ctaHref").label("Button link").defaultValue("mailto:{{siteEmail}}")
	]
});
