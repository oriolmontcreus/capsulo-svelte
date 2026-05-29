import { createSchema } from "$lib/form-builder/core/create-schema";
import type { FieldDefinition } from "$lib/form-builder/core/types";
import { Text } from "$lib/form-builder/fields/TextField/text-field.builder";
import { Textarea } from "$lib/form-builder/fields/TextareaField/textarea-field.builder";
import { RichEditor } from "$lib/form-builder/fields/RichEditorField/rich-editor-field.builder";
import { Toggle } from "$lib/form-builder/fields/ToggleField/toggle-field.builder";
import { Select } from "$lib/form-builder/fields/SelectField/select-field.builder";

export const testCapsuleSchema = createSchema<FieldDefinition>({
  name: "Test Capsule",
  key: "test-capsule",
  description: "Schema used to validate and render TestCapsule fields.",
  fields: [
    Text("eyebrow")
      .label("Eyebrow")
      .placeholder("Introducing Mist Agents")
      .translatable()
      .defaultValue("Introducing Mist Agents"),
    Text("eyebrowHref")
      .label("Eyebrow link")
      .placeholder("/")
      .defaultValue("/"),
    Text("title")
      .label("Title")
      .placeholder("Build 10x Faster with Mist")
      .required()
      .translatable()
      .defaultValue("Build 10x Faster with Mist"),
    Toggle("showDescription").label("Show Description").defaultValue(false),
    Text("description")
      .label("Description")
      .placeholder("Craft. Build. Ship Modern Websites With AI Support.")
      .translatable()
      .defaultValue("Craft. Build. Ship Modern Websites With AI Support."),
    RichEditor("richDescription")
      .label("Rich Description")
      .description("Rich text (TipTap): bold/italic/underline")
      .placeholder("Write a rich description (TipTap)...")
      .translatable()
      .defaultValue(
        "<p>Craft. <strong>Build</strong>. <u>Ship</u> Modern Websites With <em>AI</em> Support.</p>",
      ),
    Text("primaryCtaLabel")
      .label("Primary CTA label")
      .placeholder("Start Building")
      .translatable()
      .defaultValue("Start Building"),
    Text("secondaryCtaLabel")
      .label("Secondary CTA label")
      .placeholder("Watch Video")
      .translatable()
      .defaultValue("Watch Video"),
    Text("imageSrc")
      .label("Image URL")
      .placeholder("https://sv-blocks.vercel.app/mist/tailark-2.png")
      .defaultValue("https://sv-blocks.vercel.app/mist/tailark-2.png"),
    Text("imageAlt")
      .label("Image alt text")
      .placeholder("app screen")
      .translatable()
      .defaultValue("app screen"),
    Textarea("longDescription")
      .label("Long Description")
      .placeholder("Write a detailed description here...")
      .rows(5)
      .autoresize()
      .translatable()
      .defaultValue(
        "This is a longer text that works well with a textarea field.",
      ),
    Textarea("bio")
      .label("Bio")
      .placeholder("Tell us about yourself...")
      .rows(3)
      .maxLength(500),
    Toggle("featured")
      .label("Featured")
      .description("Mark this content as featured")
      .defaultValue(false),
    Toggle("active")
      .label("Active")
      .description("Whether the capsule is currently active")
      .required()
      .defaultValue(true),
    Select("country")
      .label("Country")
      .placeholder("Select a country")
      .options([
        { label: "United States", value: "us" },
        { label: "United Kingdom", value: "uk" },
        { label: "Canada", value: "ca" },
        { label: "Australia", value: "au" },
        { label: "Germany", value: "de" },
        { label: "France", value: "fr" },
      ]),
    Select("framework")
      .label("Framework")
      .placeholder("Choose a framework")
      .groups([
        {
          label: "Frontend",
          options: [
            { label: "React", value: "react" },
            { label: "Vue", value: "vue" },
            { label: "Svelte", value: "svelte" },
          ],
        },
        {
          label: "Backend",
          options: [
            { label: "Express", value: "express" },
            { label: "Fastify", value: "fastify" },
            { label: "Django", value: "django" },
          ],
        },
      ]),
  ],
});
