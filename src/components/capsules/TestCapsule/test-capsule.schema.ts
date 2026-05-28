import { createSchema } from "$lib/form-builder/core/create-schema";
import type { FieldDefinition } from "$lib/form-builder/core/types";
import { TextField } from "$lib/form-builder/fields/TextField/text-field.builder";
import { TextareaField } from "$lib/form-builder/fields/TextareaField/textarea-field.builder";
import { RichEditorField } from "$lib/form-builder/fields/RichEditorField/rich-editor-field.builder";

export const testCapsuleSchema = createSchema<FieldDefinition>({
	name: "Test Capsule",
	key: "test-capsule",
	description: "Schema used to validate and render TestCapsule fields.",
	fields: [
		TextField("eyebrow")
			.label("Eyebrow")
			.placeholder("Introducing Mist Agents")
			.translatable()
			.defaultValue("Introducing Mist Agents"),
		TextField("eyebrowHref")
			.label("Eyebrow link")
			.placeholder("/")
			.defaultValue("/"),
		TextField("title")
			.label("Title")
			.placeholder("Build 10x Faster with Mist")
			.required()
			.translatable()
			.defaultValue("Build 10x Faster with Mist"),
		TextField("description")
			.label("Description")
			.placeholder("Craft. Build. Ship Modern Websites With AI Support.")
			.translatable()
			.defaultValue("Craft. Build. Ship Modern Websites With AI Support."),
		RichEditorField("richDescription")
			.label("Rich Description")
			.description("Rich text (TipTap): bold/italic/underline")
			.placeholder("Write a rich description (TipTap)...")
			.translatable()
			.defaultValue("<p>Craft. <strong>Build</strong>. <u>Ship</u> Modern Websites With <em>AI</em> Support.</p>"),
		TextField("primaryCtaLabel")
			.label("Primary CTA label")
			.placeholder("Start Building")
			.translatable()
			.defaultValue("Start Building"),
		TextField("secondaryCtaLabel")
			.label("Secondary CTA label")
			.placeholder("Watch Video")
			.translatable()
			.defaultValue("Watch Video"),
		TextField("imageSrc")
			.label("Image URL")
			.placeholder("https://sv-blocks.vercel.app/mist/tailark-2.png")
			.defaultValue("https://sv-blocks.vercel.app/mist/tailark-2.png"),
		TextField("imageAlt")
			.label("Image alt text")
			.placeholder("app screen")
			.translatable()
			.defaultValue("app screen"),
		TextareaField("longDescription")
			.label("Long Description")
			.placeholder("Write a detailed description here...")
			.rows(5)
			.autoresize()
			.translatable()
			.defaultValue("This is a longer text that works well with a textarea field."),
		TextareaField("bio")
			.label("Bio")
			.placeholder("Tell us about yourself...")
			.rows(3)
			.maxLength(500)
	]
});
