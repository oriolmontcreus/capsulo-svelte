import { createSchema, type FieldDefinition, Text } from "capsulo/schema";

/** Site-wide values editors set once and use anywhere as {{key}} (e.g. {{siteName}}). */
export const globalsSchema = createSchema<FieldDefinition>({
	name: "Global Variables",
	key: "globals",
	description: "Site-wide settings and contact information",
	fields: [
		Text("siteName")
			.label("Site Name")
			.required()
			.translatable()
			.defaultValue("My Capsulo site"),
		Text("siteEmail")
			.label("Contact Email")
			.placeholder("contact@example.com")
			.defaultValue("contact@example.com")
	]
});
