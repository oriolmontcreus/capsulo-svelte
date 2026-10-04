import { createSchema, type FieldDefinition, ColorPicker, FileUpload, Repeater, RichEditor, Select, Text, Textarea, Toggle } from "capsulo/schema";

export const repeaterTestsSchema = createSchema<FieldDefinition>({
  name: "Repeater Tests",
  key: "repeater-tests",
  description:
    "Test capsule for the Repeater field: translatable children, limits, defaults and nesting.",
  fields: [
    Text("heading")
      .label("Heading")
      .translatable()
      .defaultValue("Repeater field tests"),

    // ─── 1. Basic cards: translatable text + an image per item ───
    Repeater("cards", [
      Text("title").label("Title").translatable().required(),
      Textarea("body").label("Body").rows(3).translatable(),
      FileUpload("image").label("Image").images(),
    ])
      .label("Cards")
      .description("Basic repeater with translatable text and an image")
      .itemName("Card"),

    // ─── 2. Limits + defaults ───
    Repeater("stats", [
      Text("value").label("Value").placeholder("10k"),
      Text("label").label("Label").translatable().placeholder("Users"),
    ])
      .label("Stats")
      .description("Between 2 and 4 stats, seeded with two defaults")
      .itemName("Stat")
      .minItems(2)
      .maxItems(4)
      .defaultValue([
        { value: "10k", label: "Users" },
        { value: "99.9%", label: "Uptime" },
      ]),

    // ─── 3. Nested: FAQ sections with their questions ───
    Repeater("faq", [
      Text("section").label("Section").translatable(),
      Repeater("questions", [
        Text("question").label("Question").translatable(),
        RichEditor("answer").label("Answer").translatable(),
      ])
        .label("Questions")
        .itemName("Question"),
    ])
      .label("FAQ")
      .description("Sections that each hold a list of questions")
      .itemName("Section"),

    // ─── 4. Select, toggle and color inside items ───
    Repeater("buttons", [
      Text("label").label("Label").translatable(),
      Text("href").label("Link").placeholder("/"),
      Select("variant")
        .label("Variant")
        .options([
          { label: "Primary", value: "primary" },
          { label: "Secondary", value: "secondary" },
          { label: "Ghost", value: "ghost" },
        ])
        .defaultValue("primary"),
      Toggle("external").label("Opens in a new tab"),
      ColorPicker("accent").label("Accent color"),
    ])
      .label("Buttons")
      .itemName("Button")
      .maxItems(3),
  ],
});
