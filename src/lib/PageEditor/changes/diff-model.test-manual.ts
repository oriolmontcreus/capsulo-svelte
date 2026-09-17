/**
 * Assert-based self-check for the diff model. No test framework.
 *
 * Run with:  npx tsx src/lib/PageEditor/changes/diff-model.test-manual.ts
 */
import assert from "node:assert/strict";
import {
	computePageChangeSet,
	countFieldChanges,
	pageHasChanges
} from "./diff-model";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

function values(input: PageEditorValuesByInstance): PageEditorValuesByInstance {
	return input;
}

// 1. Unchanged -> no changes
{
	const baseline = values({ "cap-01": { title: { en: "Hello" } } });
	const draft = values({ "cap-01": { title: { en: "Hello" } } });
	const cs = computePageChangeSet("home", baseline, draft);
	assert.equal(pageHasChanges(cs), false, "unchanged should report no changes");
	assert.equal(cs.instances.length, 0);
}

// 2. Single-locale text change
{
	const baseline = values({ "cap-01": { title: { en: "Hello", es: "Hola" } } });
	const draft = values({ "cap-01": { title: { en: "Hi", es: "Hola" } } });
	const cs = computePageChangeSet("home", baseline, draft);
	assert.equal(cs.instances.length, 1);
	assert.equal(countFieldChanges(cs), 1, "only the changed locale should be reported");
	const change = cs.instances[0].fields[0];
	assert.equal(change.fieldName, "title");
	assert.equal(change.locale, "en");
	assert.equal(change.kind, "changed");
	assert.equal(change.oldValue, "Hello");
	assert.equal(change.newValue, "Hi");
	assert.equal(cs.instances[0].isNew, false);
}

// 3. New instance
{
	const baseline = values({});
	const draft = values({ "cap-01": { title: { en: "Hello" } } });
	const cs = computePageChangeSet("home", baseline, draft);
	assert.equal(cs.instances.length, 1);
	assert.equal(cs.instances[0].isNew, true, "instance absent from baseline is new");
	assert.equal(cs.instances[0].fields[0].kind, "added");
}

// 4. Toggle false -> true (false must be preserved, not treated as empty)
{
	const baseline = values({ "cap-01": { active: { en: false } } });
	const draft = values({ "cap-01": { active: { en: true } } });
	const cs = computePageChangeSet("home", baseline, draft);
	assert.equal(countFieldChanges(cs), 1);
	const change = cs.instances[0].fields[0];
	assert.equal(change.kind, "changed");
	assert.equal(change.oldValue, false);
	assert.equal(change.newValue, true);
}

// 5a. Emptied field where baseline was also empty -> no change ("" <-> null)
{
	const baseline = values({ "cap-01": { subtitle: { en: "" } } });
	const draft = values({ "cap-01": { subtitle: { en: null as unknown as string } } });
	const cs = computePageChangeSet("home", baseline, draft);
	assert.equal(pageHasChanges(cs), false, "empty-to-empty should not be a change");
}

// 5b. Clearing a real value -> removed
{
	const baseline = values({ "cap-01": { subtitle: { en: "text" } } });
	const draft = values({ "cap-01": { subtitle: { en: "" } } });
	const cs = computePageChangeSet("home", baseline, draft);
	assert.equal(countFieldChanges(cs), 1);
	assert.equal(cs.instances[0].fields[0].kind, "removed");
}

// 6. Empty array <-> undefined is not a change; array content change is reported
{
	const baseline = values({ "cap-01": { tags: { en: [] as string[] } } });
	const draft = values({ "cap-01": { tags: { en: undefined as unknown as string[] } } });
	assert.equal(pageHasChanges(computePageChangeSet("home", baseline, draft)), false);

	const draft2 = values({ "cap-01": { tags: { en: ["a", "b"] } } });
	const cs = computePageChangeSet("home", baseline, draft2);
	assert.equal(countFieldChanges(cs), 1);
	assert.equal(cs.instances[0].fields[0].kind, "added");
}

console.log("diff-model self-check passed");
