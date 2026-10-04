/**
 * Assert-based self-check for the draft value setter. No test framework.
 *
 * Run with:  npx tsx src/lib/PageEditor/changes/draft-values.test-manual.ts
 *
 * The round-trip cases are the ones that matter: recovering an old value must
 * make the page dirty, and reverting it back must leave no change behind.
 */
import assert from "node:assert/strict";
import { setDraftFieldValue } from "./draft-values";
import { computePageChangeSet, countFieldChanges } from "./diff-model";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

const baseline: PageEditorValuesByInstance = {
	"cap-01": { title: { en: "Committed", es: "Comprometido" } }
};

// 1. Setting one locale leaves the others untouched.
{
	const next = setDraftFieldValue(baseline, {
		instanceId: "cap-01",
		fieldName: "title",
		locale: "en"
	}, "Recovered");

	assert.equal(next["cap-01"].title.en, "Recovered");
	assert.equal(next["cap-01"].title.es, "Comprometido", "other locales must survive");
}

// 2. The input is not mutated (the editor keeps rendering the old object).
{
	const before = JSON.stringify(baseline);
	setDraftFieldValue(baseline, { instanceId: "cap-01", fieldName: "title", locale: "en" }, "x");
	assert.equal(JSON.stringify(baseline), before, "setDraftFieldValue must not mutate its input");
}

// 3. Recover makes the page dirty; reverting the same field clears it again.
{
	const recovered = setDraftFieldValue(baseline, {
		instanceId: "cap-01",
		fieldName: "title",
		locale: "en"
	}, "Old headline");
	const dirty = computePageChangeSet("home", baseline, recovered);
	assert.equal(countFieldChanges(dirty), 1, "recover should surface exactly one change");
	assert.equal(dirty.instances[0].fields[0].oldValue, "Committed");
	assert.equal(dirty.instances[0].fields[0].newValue, "Old headline");

	const reverted = setDraftFieldValue(recovered, {
		instanceId: "cap-01",
		fieldName: "title",
		locale: "en"
	}, dirty.instances[0].fields[0].oldValue);
	assert.equal(
		countFieldChanges(computePageChangeSet("home", baseline, reverted)),
		0,
		"reverting to the baseline value should leave no change"
	);
}

// 4. Recovering an "added" field back to empty counts as reverted, not as a
//    change to the string "undefined".
{
	const draft = setDraftFieldValue(baseline, {
		instanceId: "cap-01",
		fieldName: "subtitle",
		locale: "en"
	}, "Added later");
	assert.equal(countFieldChanges(computePageChangeSet("home", baseline, draft)), 1);

	const cleared = setDraftFieldValue(draft, {
		instanceId: "cap-01",
		fieldName: "subtitle",
		locale: "en"
	}, undefined);
	assert.equal(
		countFieldChanges(computePageChangeSet("home", baseline, cleared)),
		0,
		"clearing an added field should be treated as empty, not as a change"
	);
}

// 5. Targeting an instance/field that does not exist yet creates it.
{
	const next = setDraftFieldValue({}, {
		instanceId: "cap-02",
		fieldName: "heading",
		locale: "en"
	}, "Brand new");
	assert.equal(next["cap-02"].heading.en, "Brand new");
}

console.log("draft-values self-check passed");
