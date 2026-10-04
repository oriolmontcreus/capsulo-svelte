/**
 * Assert-based self-check for the history model. No test framework.
 *
 * Run with:  npx tsx src/lib/PageEditor/history/history-model.test-manual.ts
 *
 * The grouping case is the one that matters: a commit spanning several pages has
 * to come back as ONE entry. The legacy CMS had no grouping at all, and before
 * the commits table this project produced one entry per touched page.
 */
import assert from "node:assert/strict";
import {
	buildCommitEntries,
	groupCommitsByDay,
	nextCommitCursor,
	splitCommitMessage,
	type CommitRow,
	type ProfileRow,
	type RevisionRow
} from "./history-model";

const AUTHOR = "11111111-1111-1111-1111-111111111111";
const profiles: ProfileRow[] = [
	{ id: AUTHOR, name: "Ada", avatar_url: "https://example.test/ada.png" }
];

// 1. A commit touching three pages is a single entry listing all three.
{
	const commits: CommitRow[] = [
		{ id: "c1", message: "fix hero copy", created_by: AUTHOR, created_at: "2026-09-17T10:00:00.000Z" }
	];
	const revisions: RevisionRow[] = [
		{ id: 3, page_id: "contact", created_at: "2026-09-17T10:00:00.000Z", commit_id: "c1" },
		{ id: 1, page_id: "home", created_at: "2026-09-17T10:00:00.000Z", commit_id: "c1" },
		{ id: 2, page_id: "about", created_at: "2026-09-17T10:00:00.000Z", commit_id: "c1" }
	];

	const entries = buildCommitEntries(commits, revisions, profiles);
	assert.equal(entries.length, 1, "one commit across three pages must be ONE entry");
	assert.equal(entries[0].revisions.length, 3);
	assert.deepEqual(
		entries[0].revisions.map((revision) => revision.pageId),
		["about", "contact", "home"],
		"pages should be listed in a stable order"
	);
	assert.equal(entries[0].authorName, "Ada");
	assert.equal(entries[0].authorAvatarUrl, "https://example.test/ada.png");
	assert.equal(entries[0].subject, "fix hero copy");
}

// 2. Commit order is preserved and unknown authors degrade to null.
{
	const commits: CommitRow[] = [
		{ id: "c2", message: "newer", created_by: null, created_at: "2026-09-17T12:00:00.000Z" },
		{ id: "c1", message: "older", created_by: "missing-user", created_at: "2026-09-17T09:00:00.000Z" }
	];
	const revisions: RevisionRow[] = [
		{ id: 1, page_id: "home", created_at: "2026-09-17T09:00:00.000Z", commit_id: "c1" },
		{ id: 2, page_id: "home", created_at: "2026-09-17T12:00:00.000Z", commit_id: "c2" }
	];

	const entries = buildCommitEntries(commits, revisions, profiles);
	assert.deepEqual(entries.map((entry) => entry.commitId), ["c2", "c1"], "newest first must survive");
	assert.equal(entries[0].authorName, null, "a null author must not throw");
	assert.equal(entries[0].authorAvatarUrl, null);
	assert.equal(entries[1].authorName, null, "an unknown author id must not throw");
	assert.equal(entries[1].authorAvatarUrl, null, "an unknown author has no avatar");
}

// 3. A commit whose page writes all failed leaves an empty row - skip it.
{
	const commits: CommitRow[] = [
		{ id: "empty", message: "nothing landed", created_by: AUTHOR, created_at: "2026-09-17T10:00:00.000Z" }
	];
	assert.equal(buildCommitEntries(commits, [], profiles).length, 0, "empty commits must be hidden");
}

// 4. Orphan revisions (commit_id null) never attach to an unrelated commit.
{
	const commits: CommitRow[] = [
		{ id: "c1", message: "m", created_by: AUTHOR, created_at: "2026-09-17T10:00:00.000Z" }
	];
	const revisions: RevisionRow[] = [
		{ id: 1, page_id: "home", created_at: "2026-09-17T10:00:00.000Z", commit_id: "c1" },
		{ id: 2, page_id: "stray", created_at: "2026-09-17T10:00:00.000Z", commit_id: null }
	];
	const entries = buildCommitEntries(commits, revisions, profiles);
	assert.equal(entries[0].revisions.length, 1);
	assert.equal(entries[0].revisions[0].pageId, "home");
}

// 5. Subject/body split.
{
	assert.deepEqual(splitCommitMessage("just a subject"), { subject: "just a subject", body: "" });
	assert.deepEqual(splitCommitMessage("subject\n\nbody line one\nbody line two"), {
		subject: "subject",
		body: "body line one\nbody line two"
	});
	assert.equal(splitCommitMessage("").subject, "(no message)", "empty messages need a label");
	assert.equal(splitCommitMessage("   \nbody").subject, "(no message)");
}

// 6. Day grouping collapses runs of the same local day without reordering.
{
	const now = Date.parse("2026-09-17T18:00:00.000Z");
	const at = (iso: string): CommitRow => ({ id: iso, message: "m", created_by: null, created_at: iso });
	const rows = [
		at("2026-09-17T12:00:00.000Z"),
		at("2026-09-17T09:00:00.000Z"),
		at("2026-09-15T09:00:00.000Z")
	];
	const revisions: RevisionRow[] = rows.map((row, index) => ({
		id: index + 1,
		page_id: "home",
		created_at: row.created_at,
		commit_id: row.id
	}));

	const groups = groupCommitsByDay(buildCommitEntries(rows, revisions, profiles), now);
	assert.equal(groups.length, 2, "two same-day commits belong to one group");
	assert.equal(groups[0].commits.length, 2);
	assert.equal(groups[0].label, "Today");
	assert.equal(groups[1].commits.length, 1);
	assert.notEqual(groups[1].label, "Today");
}

// 7. The keyset cursor is the OLDEST loaded timestamp, so "Load more" walks
//    backwards. Getting this wrong is exactly how the legacy page ended up stuck
//    showing its 30 oldest commits forever.
{
	const rows: CommitRow[] = [
		{ id: "c3", message: "m", created_by: null, created_at: "2026-09-17T12:00:00.000Z" },
		{ id: "c2", message: "m", created_by: null, created_at: "2026-09-17T11:00:00.000Z" },
		{ id: "c1", message: "m", created_by: null, created_at: "2026-09-17T10:00:00.000Z" }
	];
	assert.equal(nextCommitCursor(rows), "2026-09-17T10:00:00.000Z");
	assert.equal(nextCommitCursor([]), null);
}

console.log("history-model self-check passed");
