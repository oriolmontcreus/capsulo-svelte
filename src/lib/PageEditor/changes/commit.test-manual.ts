/**
 * Assert-based self-check for the commit page-selection logic. No test framework.
 * Covers the skip-empty guard and missing-cache handling used by commitChanges.
 *
 * Run with:  npx tsx src/lib/PageEditor/changes/commit.test-manual.ts
 */
import assert from "node:assert/strict";
import { selectCommittableDocuments } from "./commit-selection";
import type {
	PageEditorCachedDocument,
	PageEditorValuesByInstance
} from "$lib/PageEditor/persistence";

function doc(
	pageId: string,
	baseline: PageEditorValuesByInstance,
	draft: PageEditorValuesByInstance
): PageEditorCachedDocument {
	return {
		pageId,
		valuesByInstance: draft,
		baselineValuesByInstance: baseline,
		updatedAt: null,
		cachedAt: ""
	};
}

const changed = doc(
	"home",
	{ "cap-01": { title: { en: "Hello" } } },
	{ "cap-01": { title: { en: "Hi" } } }
);
const unchanged = doc(
	"about",
	{ "cap-01": { title: { en: "Same" } } },
	{ "cap-01": { title: { en: "Same" } } }
);
// Emptied-to-empty must not count as a change (mirrors diff-model normalization).
const noop = doc(
	"contact",
	{ "cap-01": { subtitle: { en: "" } } },
	{ "cap-01": { subtitle: { en: null as unknown as string } } }
);

// 1. Only pages whose draft differs from baseline are selected.
{
	const result = selectCommittableDocuments(
		[changed, unchanged, noop],
		["home", "about", "contact"]
	);
	assert.equal(result.length, 1, "only the changed page is committable");
	assert.equal(result[0].pageId, "home");
}

// 2. Requested ids with no cache entry are skipped (no throw).
{
	const result = selectCommittableDocuments([changed], ["home", "missing"]);
	assert.deepEqual(
		result.map((document) => document.pageId),
		["home"]
	);
}

// 3. Request order is preserved.
{
	const other = doc(
		"blog",
		{ "cap-01": { title: { en: "A" } } },
		{ "cap-01": { title: { en: "B" } } }
	);
	const result = selectCommittableDocuments([changed, other], ["blog", "home"]);
	assert.deepEqual(
		result.map((document) => document.pageId),
		["blog", "home"]
	);
}

// 4. Empty request -> nothing committable.
{
	assert.equal(selectCommittableDocuments([changed], []).length, 0);
}

console.log("commit self-check passed");
