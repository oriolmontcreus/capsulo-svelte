import { createSchema, type FieldDefinition, Repeater, RichEditor, Select, Text, Textarea, Toggle } from "capsulo/schema";

export const validationTestsSchema = createSchema<FieldDefinition>({
  name: "Validation Tests",
  key: "validation-tests",
  description:
    "Test capsule for conditional fields, Text/Textarea/RichEditor options and required validation.",
  fields: [
    // ─── 1. Required in the default locale ───
    Text("title")
      .label("Title")
      .description("Required: must be filled in the default language before committing.")
      .required()
      .translatable()
      .minLength(3)
      .maxLength(60)
      .defaultValue("Validation tests"),

    // ─── 2. Conditional: shown and required only when the toggle is on ───
    Toggle("showCta").label("Show call to action").defaultValue(false),
    Text("ctaLabel")
      .label("CTA label")
      .translatable()
      .hidden((values) => values.showCta !== true)
      .required((values) => values.showCta === true),
    Text("ctaUrl")
      .label("CTA link")
      .type("url")
      .placeholder("https://example.com or /contact")
      .hidden((values) => values.showCta !== true)
      .required((values) => values.showCta === true),

    // ─── 3. Text input types and options ───
    Text("contactEmail").label("Contact email").type("email").placeholder("hello@example.com"),
    Text("price")
      .label("Price")
      .type("number")
      .min(0)
      .max(10000)
      .step(0.01)
      .prefix("€")
      .description("Number between 0 and 10,000 with up to two decimals.")
      .defaultValue(19.99),
    Text("seats")
      .label("Seats")
      .type("number")
      .min(1)
      .allowDecimals(false)
      .suffix("people"),
    Text("slug")
      .label("Slug")
      .prefix("/")
      .regex("[a-z0-9]+(?:-[a-z0-9]+)*")
      .description("Lowercase letters, numbers and dashes."),
    Text("apiKey").label("Embed key").type("password").description("Masked in diffs and hidden from the AI."),

    // ─── 4. Required depending on a select ───
    Select("audience")
      .label("Audience")
      .options([
        { label: "Everyone", value: "everyone" },
        { label: "Members only", value: "members" },
      ])
      .defaultValue("everyone"),
    Textarea("membersNote")
      .label("Members note")
      .description("Required when the audience is \"Members only\".")
      .translatable()
      .minLength(10)
      .minRows(2)
      .maxRows(6)
      .resize("vertical")
      .required((values) => values.audience === "members"),

    // ─── 5. Rich text length limits ───
    RichEditor("summary")
      .label("Summary")
      .translatable()
      .maxLength(280)
      .description("Up to 280 visible characters."),

    // ─── 6. Repeater: required items with conditional child fields ───
    Repeater("speakers", [
      Text("name").label("Name").required(),
      Toggle("hasWebsite").label("Has website"),
      Text("website")
        .label("Website")
        .type("url")
        .hidden((item) => item.hasWebsite !== true)
        .required((item) => item.hasWebsite === true),
    ])
      .label("Speakers")
      .itemName("Speaker")
      .required()
      .maxItems(4),
  ],
});
