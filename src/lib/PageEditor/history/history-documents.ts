import { capsuloFetch } from "$lib/api/capsulo-client";
import {
	deserializePageEditorValues,
	type PageEditorValuesByInstance
} from "$lib/PageEditor/persistence";
import {
	buildCommitEntries,
	nextCommitCursor,
	type CommitEntry,
	type CommitRow,
	type ProfileRow,
	type RevisionRow
} from "./history-model";

const COMMIT_PAGE_SIZE = 25;

export type LoadCommitPageResult = {
	commits: CommitEntry[];
	/** Pass back into loadCommitPage to fetch the next (older) page. */
	nextCursor: string | null;
	hasMore: boolean;
	errorMessage: string | null;
};

const EMPTY_PAGE: Omit<LoadCommitPageResult, "errorMessage"> = {
	commits: [],
	nextCursor: null,
	hasMore: false
};

/**
 * Loads one page of commits, newest first, with the pages each one touched and
 * the authors' display names.
 *
 * One request (three D1 queries) regardless of how many commits or pages come back -
 * no per-commit or per-page round trip. Content is deliberately not selected here; it is fetched
 * only for the page the user actually opens (see loadRevisionWithParent).
 *
 * Pagination is keyset (`created_at < cursor`) rather than offset, so a commit
 * made while the list is open cannot shift rows into or out of the next page.
 */
export async function loadCommitPage(
	cursor: string | null = null,
	limit: number = COMMIT_PAGE_SIZE
): Promise<LoadCommitPageResult> {
	const params = new URLSearchParams({ limit: String(limit) });
	if (cursor) params.set("cursor", cursor);

	const { data, error } = await capsuloFetch<{
		commits: CommitRow[];
		revisions: RevisionRow[];
		authors: ProfileRow[];
	}>(`/commits?${params}`);
	if (error !== null) return { ...EMPTY_PAGE, errorMessage: error };
	if (data.commits.length === 0) return { ...EMPTY_PAGE, errorMessage: null };

	return {
		commits: buildCommitEntries(data.commits, data.revisions, data.authors),
		nextCursor: nextCommitCursor(data.commits),
		hasMore: data.commits.length === limit,
		errorMessage: null
	};
}

export type LoadRevisionResult = {
	/** Content as of this revision (the "new" side of the diff). */
	revisionValues: PageEditorValuesByInstance;
	/** Content immediately before it (the "old" side). */
	parentValues: PageEditorValuesByInstance;
	/** True when this revision created the page, so there is nothing to diff against. */
	isFirstRevision: boolean;
	errorMessage: string | null;
};

const EMPTY_REVISION: Omit<LoadRevisionResult, "errorMessage"> = {
	revisionValues: {},
	parentValues: {},
	isFirstRevision: false
};

/**
 * Loads both sides of one page's diff in a single round trip: the revision plus
 * the one immediately before it for the same page.
 *
 * The legacy CMS fetched every changed file's content at both the commit and its
 * parent up front - two requests per file, for files the user never opened. Here
 * ids are monotonic per the identity column, so "the revision and its parent" is
 * just the two newest rows at or below this id.
 */
export async function loadRevisionWithParent(
	pageId: string,
	revisionId: number
): Promise<LoadRevisionResult> {
	const params = new URLSearchParams({ pageId, revisionId: String(revisionId) });
	const { data, error } = await capsuloFetch<{ revisions: { id: number; content: unknown }[] }>(
		`/revisions?${params}`
	);
	if (error !== null) return { ...EMPTY_REVISION, errorMessage: error };

	const revision = data.revisions.find((row) => row.id === revisionId);
	if (!revision) {
		return { ...EMPTY_REVISION, errorMessage: "That revision is no longer available." };
	}

	const parent = data.revisions.find((row) => row.id !== revisionId) ?? null;

	return {
		revisionValues: deserializePageEditorValues(revision.content),
		parentValues: parent ? deserializePageEditorValues(parent.content) : {},
		isFirstRevision: parent === null,
		errorMessage: null
	};
}
