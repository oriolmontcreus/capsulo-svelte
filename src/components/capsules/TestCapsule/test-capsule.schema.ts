import { createSchema } from "$lib/form-builder/core/create-schema";
import { TextField } from "$lib/form-builder/fields/TextField/text-field.builder";

export const testCapsuleSchema = createSchema({
	name: "Test Capsule",
	key: "test-capsule",
	description: "Schema used to validate and render TestCapsule fields.",
	fields: [
		TextField("eyebrow")
			.label("Eyebrow")
			.placeholder("Capsulo prototype")
			.defaultValue("Capsulo prototype"),
		TextField("title")
			.label("Title")
			.placeholder("Autodetected capsule")
			.required()
			.translatable()
			.defaultValue("Autodetected capsule"),
		TextField("description")
			.label("Description")
			.placeholder("This content is editable from the prototype admin.")
			.translatable()
			.defaultValue("This content is editable from the prototype admin."),
		TextField("ctaLabel")
			.label("CTA label")
			.placeholder("Read more")
			.translatable()
			.defaultValue("Read more")
	]
});
