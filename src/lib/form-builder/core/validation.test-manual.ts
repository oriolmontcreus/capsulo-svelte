/**
 * Assert-based self-check for conditions and the content validator. No test framework.
 *
 * Run with:  npx tsx src/lib/form-builder/core/validation.test-manual.ts
 */
import assert from "node:assert/strict";
import { createSchema } from "./create-schema";
import { validateFieldValue, validateSchemaValues, type ValidationIssue } from "./validation";
import { Text } from "../fields/TextField/text-field.builder";
import { Textarea } from "../fields/TextareaField/textarea-field.builder";
import { RichEditor } from "../fields/RichEditorField/rich-editor-field.builder";
import { Toggle } from "../fields/ToggleField/toggle-field.builder";
import { Select } from "../fields/SelectField/select-field.builder";
import { FileUpload } from "../fields/FileUploadField/file-upload-field.builder";
import { Repeater } from "../fields/RepeaterField/repeater-field.builder";
import type { FieldDefinition, SchemaValues } from "./types";

const options = { defaultLocale: "es", locales: ["es", "en"] };

function messages(issues: ValidationIssue[]): string[] {
	return issues.map((issue) => `${issue.path.join(".")}@${issue.locale}: ${issue.message}`);
}

// 1. Required means filled in the default locale only.
{
	const schema = createSchema<FieldDefinition>({
		name: "T",
		key: "t",
		fields: [Text("title").label("Title").required().translatable()],
	});
	assert.deepEqual(messages(validateSchemaValues(schema, { title: { es: "Hola", en: "" } }, options)), []);
	assert.deepEqual(messages(validateSchemaValues(schema, { title: { es: "  ", en: "Hi" } }, options)), [
		"title@es: Title is required.",
	]);
	assert.deepEqual(messages(validateSchemaValues(schema, {}, options)), ["title@es: Title is required."]);
}

// 2. Format rules apply to every filled-in locale; missing translations are fine.
{
	const schema = createSchema<FieldDefinition>({
		name: "T",
		key: "t",
		fields: [Text("slug").label("Slug").translatable().minLength(3).regex("[a-z-]+")],
	});
	assert.deepEqual(messages(validateSchemaValues(schema, { slug: { es: "hola-mundo" } }, options)), []);
	assert.deepEqual(messages(validateSchemaValues(schema, { slug: { es: "hola", en: "Hi!" } }, options)), [
		"slug@en: Slug has an invalid format.",
	]);
	assert.deepEqual(messages(validateSchemaValues(schema, { slug: { es: "ab" } }, options)), [
		"slug@es: Slug needs at least 3 characters (has 2).",
	]);
	// Empty, not required: nothing to check.
	assert.deepEqual(messages(validateSchemaValues(schema, { slug: { es: "" } }, options)), []);
}

// 3. Hidden fields are skipped; conditions see sibling values in the default locale.
{
	const schema = createSchema<FieldDefinition>({
		name: "T",
		key: "t",
		fields: [
			Toggle("showCta"),
			Text("ctaUrl")
				.label("CTA link")
				.type("url")
				.hidden((values) => values.showCta !== true)
				.required((values) => values.showCta === true),
		],
	});
	assert.deepEqual(messages(validateSchemaValues(schema, { showCta: { es: false }, ctaUrl: { es: "" } }, options)), []);
	assert.deepEqual(messages(validateSchemaValues(schema, { showCta: { es: true }, ctaUrl: { es: "" } }, options)), [
		"ctaUrl@es: CTA link is required.",
	]);
	assert.deepEqual(
		messages(validateSchemaValues(schema, { showCta: { es: true }, ctaUrl: { es: "not a url" } }, options)),
		['ctaUrl@es: CTA link must be a full URL (https://...) or a path starting with "/".'],
	);
	assert.deepEqual(messages(validateSchemaValues(schema, { showCta: { es: true }, ctaUrl: { es: "/about" } }, options)), []);
	// A throwing condition counts as false instead of crashing.
	const broken = createSchema<FieldDefinition>({
		name: "T",
		key: "t",
		fields: [Text("a").required(() => { throw new Error("boom"); })],
	});
	const originalError = console.error;
	console.error = () => {};
	assert.deepEqual(messages(validateSchemaValues(broken, {}, options)), []);
	console.error = originalError;
}

// 4. Numbers: type, range, decimals, step.
{
	const price = Text("price").label("Price").type("number").min(0).max(100).step(0.5).build();
	assert.equal(validateFieldValue(price, 10.5), null);
	assert.equal(validateFieldValue(price, null), null);
	assert.equal(validateFieldValue(price, "10"), "Price must be a number.");
	assert.equal(validateFieldValue(price, -1), "Price must be at least 0.");
	assert.equal(validateFieldValue(price, 101), "Price must be at most 100.");
	assert.equal(validateFieldValue(price, 10.25), "Price must be in steps of 0.5.");
	const qty = Text("qty").label("Qty").type("number").allowDecimals(false).build();
	assert.equal(validateFieldValue(qty, 2.5), "Qty must be a whole number.");
	assert.equal(validateFieldValue(Text("p").type("number").step(0.1).build(), 0.3), null, "float-safe step");

	const schema = createSchema<FieldDefinition>({ name: "T", key: "t", fields: [Text("price").label("Price").type("number").required()] });
	assert.deepEqual(messages(validateSchemaValues(schema, { price: { es: null } }, options)), ["price@es: Price is required."]);
	assert.deepEqual(messages(validateSchemaValues(schema, { price: { es: 0 } }, options)), [], "0 is a value");
}

// 5. Email, variables, textarea and rich text lengths.
{
	const email = Text("email").label("Email").type("email").build();
	assert.equal(validateFieldValue(email, "a@b.co"), null);
	assert.equal(validateFieldValue(email, "nope"), "Email must be a valid email address.");
	assert.equal(validateFieldValue(email, "{{ siteEmail }}"), null, "variables skip format checks");

	const bio = Textarea("bio").label("Bio").maxLength(5).build();
	assert.equal(validateFieldValue(bio, "12345"), null);
	assert.equal(validateFieldValue(bio, "123456"), "Bio allows at most 5 characters (has 6).");

	const body = RichEditor("body").label("Body").minLength(5).required().build();
	assert.equal(validateFieldValue(body, "<p><strong>Hello</strong></p>"), null);
	assert.equal(validateFieldValue(body, "<p>Hi</p>"), "Body needs at least 5 characters (has 2).");
	const schema = createSchema<FieldDefinition>({ name: "T", key: "t", fields: [body] });
	assert.deepEqual(messages(validateSchemaValues(schema, { body: { es: "<p></p>" } }, options)), ["body@es: Body is required."]);
}

// 6. Toggle, select, file upload.
{
	const schema = createSchema<FieldDefinition>({
		name: "T",
		key: "t",
		fields: [
			Toggle("terms").label("Terms").required(),
			Select("color").label("Color").required().options([{ label: "Red", value: "red" }]),
			FileUpload("logo").label("Logo").required(),
		],
	});
	assert.deepEqual(messages(validateSchemaValues(schema, { terms: { es: false }, color: { es: "" }, logo: { es: [] } }, options)), [
		"terms@es: Terms must be turned on.",
		"color@es: Color is required.",
		"logo@es: Logo needs a file.",
	]);
	assert.deepEqual(
		messages(validateSchemaValues(schema, { terms: { es: true }, color: { es: "blue" }, logo: { es: ["a.png"] } }, options)),
		['color@es: Color has an option that no longer exists ("blue"). Pick another one.'],
	);
}

// 7. Repeaters: counts, required, and item fields with their own conditions.
{
	const schema = createSchema<FieldDefinition>({
		name: "T",
		key: "t",
		fields: [
			Repeater("cards", [
				Toggle("hasLink"),
				Text("title").label("Title").required().translatable(),
				Text("href").label("Link").required((item) => item.hasLink === true),
			])
				.label("Cards")
				.itemName("Card")
				.minItems(1)
				.maxItems(2),
		],
	});
	const values: SchemaValues = {
		cards: {
			es: [
				{ _id: "c1", hasLink: { es: true }, title: { es: "Uno" }, href: { es: "" } },
				{ _id: "c2", hasLink: { es: false }, title: { es: "", en: "Two" }, href: { es: "" } },
			],
		},
	};
	assert.deepEqual(messages(validateSchemaValues(schema, values, options)), [
		"cards.c1.href@es: Link is required.",
		"cards.c2.title@es: Title is required.",
	]);
	assert.deepEqual(messages(validateSchemaValues(schema, { cards: { es: [] } }, options)), [
		"cards@es: Cards needs at least 1 card (has 0).",
	]);
	const required = createSchema<FieldDefinition>({ name: "T", key: "t", fields: [Repeater("faq", [Text("q")]).label("FAQ").required()] });
	assert.deepEqual(messages(validateSchemaValues(required, {}, options)), ["faq@es: FAQ needs at least one item."]);
}

// 8. Builders reject impossible configurations when the schema loads.
{
	assert.throws(() => Text("a").minLength(5).maxLength(2).build(), RangeError);
	assert.throws(() => Text("a").min(10).max(1).build(), RangeError);
	assert.throws(() => Text("a").regex("(unclosed"), SyntaxError);
	assert.throws(() => Text("a").type("number").defaultValue("1").build(), TypeError);
	assert.throws(() => Text("a").step(0), RangeError);
}

console.log("validation self-check passed");
