import { dayKey, formatDayGroup } from "$lib/utils/format-timestamp";

/** Shape of a `commits` row as selected by history-documents.ts. */
export type CommitRow = {
	id: string;
	message: string;
	created_by: string | null;
	created_at: string;
};

/** Shape of a `pages-history` row (metadata only - never the content column). */
export type RevisionRow = {
	id: number;
	page_id: string;
	created_at: string;
	commit_id: string | null;
};

export type ProfileRow = {
	id: string;
	name: string | null;
	avatar_url: string | null;
};

export type CommitRevision = {
	revisionId: number;
	pageId: string;
	createdAt: string;
};

export type CommitEntry = {
	commitId: string;
	/** First line of the message. */
	subject: string;
	/** Everything after the first line, empty when the message is single-line. */
	body: string;
	createdAt: string;
	authorId: string | null;
	authorName: string | null;
	authorAvatarUrl: string | null;
	revisions: CommitRevision[];
};

export type CommitDayGroup = {
	key: string;
	label: string;
	commits: CommitEntry[];
};

/**
 * Splits a commit message into subject and body. The commit box soft-limits the
 * first line to 72 characters but allows more below it, so the list can show a
 * tight subject while the detail pane shows everything.
 */
export function splitCommitMessage(message: string): { subject: string; body: string } {
	const lines = message.split("\n");
	const subject = (lines[0] ?? "").trim();
	const body = lines.slice(1).join("\n").trim();
	return { subject: subject || "(no message)", body };
}

/**
 * Joins commits to the page revisions they wrote and to their authors' profile
 * names. Commit order is preserved (the query returns them newest first).
 *
 * Commits with no revisions are dropped: a commit row is created before the page
 * writes, so an action whose writes all failed can leave one behind with nothing
 * to show.
 */
export function buildCommitEntries(
	commits: CommitRow[],
	revisions: RevisionRow[],
	profiles: ProfileRow[]
): CommitEntry[] {
	const revisionsByCommit = new Map<string, CommitRevision[]>();
	for (const row of revisions) {
		if (!row.commit_id) continue;
		const existing = revisionsByCommit.get(row.commit_id);
		const revision: CommitRevision = {
			revisionId: row.id,
			pageId: row.page_id,
			createdAt: row.created_at
		};
		if (existing) existing.push(revision);
		else revisionsByCommit.set(row.commit_id, [revision]);
	}

	const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
	const entries: CommitEntry[] = [];

	for (const commit of commits) {
		const commitRevisions = revisionsByCommit.get(commit.id);
		if (!commitRevisions || commitRevisions.length === 0) continue;

		commitRevisions.sort((left, right) => left.pageId.localeCompare(right.pageId));
		const { subject, body } = splitCommitMessage(commit.message);
		const profile = commit.created_by ? profileById.get(commit.created_by) : undefined;
		const authorName = profile?.name ?? null;

		entries.push({
			commitId: commit.id,
			subject,
			body,
			createdAt: commit.created_at,
			authorId: commit.created_by,
			authorName: authorName?.trim() ? authorName.trim() : null,
			authorAvatarUrl: profile?.avatar_url ?? null,
			revisions: commitRevisions
		});
	}

	return entries;
}

/**
 * Buckets an already newest-first commit list under local-day headings. Runs of
 * the same day collapse into one group, so appending a further page of commits
 * never reorders what is already on screen.
 */
export function groupCommitsByDay(
	commits: CommitEntry[],
	nowMs: number = Date.now()
): CommitDayGroup[] {
	const groups: CommitDayGroup[] = [];
	let current: CommitDayGroup | null = null;

	for (const commit of commits) {
		const key = dayKey(commit.createdAt);
		if (!current || current.key !== key) {
			current = { key, label: formatDayGroup(commit.createdAt, nowMs), commits: [] };
			groups.push(current);
		}
		current.commits.push(commit);
	}

	return groups;
}

/**
 * Keyset cursor for the next page: the oldest `created_at` currently loaded.
 *
 * ponytail: assumes two commits never share the exact same timestamp, which would
 * drop one of them from the next page. `commits` gets one row per commit action,
 * so a collision needs two commits in the same microsecond. If that ever becomes
 * possible (bulk imports), switch to a (created_at, id) tuple comparison.
 */
export function nextCommitCursor(commits: CommitRow[]): string | null {
	if (commits.length === 0) return null;
	return commits[commits.length - 1].created_at;
}
