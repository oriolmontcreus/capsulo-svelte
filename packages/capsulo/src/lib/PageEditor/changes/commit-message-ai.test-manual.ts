/**
 * Assert-based self-check for the AI commit message helpers. No test framework.
 * Covers how pending changes are described to the model and how its reply is cleaned.
 *
 * Run with:  npx tsx --import ./packages/capsulo/test/virtual-modules.mjs packages/capsulo/src/lib/PageEditor/changes/commit-message-ai.test-manual.ts
 */
import assert from "node:assert/strict";
import { buildCommitMessageModelInput, cleanCommitMessage, parseCommitMessageRequest } from "../../ai/commit-message";
import { describeChanges, formatValue, type CapsuleInfo } from "./commit-message-context";
import type { PageChangeSet } from "./diff-model";

const hero: CapsuleInfo = {
	title: "Hero",
	fields: [
		{ type: "text", name: "title", label: "Title" },
		{ type: "rich-editor", name: "body", label: "Body" },
		{ type: "toggle", name: "visible", label: "Visible" },
		{
			type: "select",
			name: "theme",
			label: "Theme",
			options: [
				{ label: "Dark", value: "dark" },
				{ label: "Light", value: "light" }
			]
		},
		{ type: "file-upload", name: "image", label: "Image" }
	]
};
const options = {
	resolveCapsule: (instanceId: string) => (instanceId.startsWith("hero") ? hero : undefined),
	defaultLocale: "en"
};

// Value formatting.
assert.equal(formatValue("", hero.fields[0]), "(empty)");
assert.equal(formatValue(undefined, hero.fields[0]), "(empty)");
assert.equal(formatValue("<p>Hello&nbsp;<strong>world</strong></p>", hero.fields[1]), '"Hello world"');
assert.equal(formatValue(true, hero.fields[2]), "on");
assert.equal(formatValue(false, hero.fields[2]), "off");
assert.equal(formatValue("dark", hero.fields[3]), '"Dark"');
assert.equal(formatValue(["uploads/a/cat.png", "uploads/b/dog.jpg"], hero.fields[4]), '"cat.png, dog.jpg"');
assert.equal(formatValue({ a: 1 }, undefined), '"{\\"a\\":1}"');
const long = formatValue("x".repeat(500), hero.fields[0]);
assert.ok(long.length <= 162 && long.endsWith('…"'), "long values are truncated");

// Description layout.
const home: PageChangeSet = {
	pageId: "home",
	instances: [
		{
			instanceId: "hero-0",
			isNew: true,
			isRemoved: false,
			fields: [
				{ instanceId: "hero-0", fieldName: "title", locale: "en", oldValue: "", newValue: "Welcome", kind: "added" },
				{ instanceId: "hero-0", fieldName: "title", locale: "es", oldValue: "", newValue: "Hola", kind: "added" }
			]
		},
		{
			instanceId: "mystery-1",
			isNew: false,
			isRemoved: false,
			fields: [
				{ instanceId: "mystery-1", fieldName: "price", locale: "en", oldValue: 9, newValue: 12, kind: "changed" }
			]
		}
	]
};
assert.equal(
	describeChanges([{ name: "Home", changeSet: home }], options),
	[
		'Page "Home"',
		"  Hero [new]",
		'    Title: (empty) → "Welcome"',
		'    Title (es): (empty) → "Hola"',
		"  mystery-1",
		'    price: "9" → "12"'
	].join("\n")
);
assert.equal(describeChanges([{ name: "Empty", changeSet: { pageId: "empty", instances: [] } }], options), "");

// Huge commits are cut off with a count of what was left out.
const many: PageChangeSet = {
	pageId: "blog",
	instances: [
		{
			instanceId: "hero-0",
			isNew: false,
			isRemoved: false,
			fields: Array.from({ length: 500 }, (_, index) => ({
				instanceId: "hero-0",
				fieldName: "title",
				locale: `l${index}`,
				oldValue: "a".repeat(100),
				newValue: "b".repeat(100),
				kind: "changed" as const
			}))
		}
	]
};
const cut = describeChanges([{ name: "Blog", changeSet: many }], options);
assert.ok(cut.length <= 12_100, `description is capped (${cut.length})`);
assert.match(cut, /…and \d+ more field changes\.$/);

// Reply cleaning.
assert.equal(cleanCommitMessage('  "Update hero title"  '), "Update hero title");
assert.equal(cleanCommitMessage("```\nfeat: new pricing\n```"), "feat: new pricing");
assert.equal(cleanCommitMessage("```text\nfeat: new pricing\n\nMore detail\n```"), "feat: new pricing\n\nMore detail");
assert.equal(cleanCommitMessage("Commit message: Fix typo on About"), "Fix typo on About");
assert.equal(cleanCommitMessage("**Commit message:** Fix typo"), "Fix typo");
assert.equal(cleanCommitMessage("`Fix typo`"), "Fix typo");
assert.equal(cleanCommitMessage("'Fix Bob's page'"), "'Fix Bob's page'", "inner quotes keep the wrapper");
assert.equal(cleanCommitMessage("Update \"Pricing\" section"), 'Update "Pricing" section');

// Request validation.
const parsed = parseCommitMessageRequest({ changes: " x ", recentMessages: ["a", " ", "b"], draft: " fix " });
assert.deepEqual(parsed, { changes: "x", recentMessages: ["a", "b"], draft: "fix" });
assert.throws(() => parseCommitMessageRequest({ changes: "" }), /no changes/);
assert.throws(() => parseCommitMessageRequest({ changes: "x", draft: "d".repeat(3000) }), /too long/);
assert.throws(() => parseCommitMessageRequest({ changes: "x", recentMessages: "nope" }), /must be an array/);

// Model input: no thinking, and room for a reply even if a model reasons anyway.
const input = buildCommitMessageModelInput(parsed, { stream: true });
assert.deepEqual(input.chat_template_kwargs, { enable_thinking: false });
assert.ok((input.max_tokens as number) >= 1024);
assert.equal(input.stream, true);
assert.equal("tools" in input, false);

console.log("commit-message-ai: all checks passed");
