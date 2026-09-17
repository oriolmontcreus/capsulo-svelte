import { supabase } from "$/db/supabase";
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
 * Three queries regardless of how many commits or pages come back - no per-commit
 * or per-page round trip. Content is deliberately not selected here; it is fetched
 * only for the page the user actually opens (see loadRevisionWithParent).
 *
 * Pagination is keyset (`created_at < cursor`) rather than offset, so a commit
 * made while the list is open cannot shift rows into or out of the next page.
 */
export async function loadCommitPage(
	cursor: string | null = null,
	limit: number = COMMIT_PAGE_SIZE
): Promise<LoadCommitPageResult> {
	let commitQuery = supabase
		.from("commits")
		.select("id, message, created_by, created_at")
		.order("created_at", { ascending: false })
		.limit(limit);

	if (cursor) commitQuery = commitQuery.lt("created_at", cursor);

	const { data: commitData, error: commitError } = await commitQuery;
	if (commitError) return { ...EMPTY_PAGE, errorMessage: commitError.message };

	const commits = (commitData ?? []) as CommitRow[];
	if (commits.length === 0) return { ...EMPTY_PAGE, errorMessage: null };

	const { data: revisionData, error: revisionError } = await supabase
		.from("pages-history")
		.select("id, page_id, created_at, commit_id")
		.in(
			"commit_id",
			commits.map((commit) => commit.id)
		);

	if (revisionError) return { ...EMPTY_PAGE, errorMessage: revisionError.message };

	const authorIds = [
		...new Set(
			commits
				.map((commit) => commit.created_by)
				.filter((id): id is string => typeof id === "string" && id.length > 0)
		)
	];

	let profiles: ProfileRow[] = [];
	if (authorIds.length > 0) {
		const { data: profileData, error: profileError } = await supabase
			.from("user_profiles")
			.select("id, name, avatar_url")
			.in("id", authorIds);
		// Author names are cosmetic; losing them must not hide the history itself.
		if (!profileError) profiles = (profileData ?? []) as ProfileRow[];
	}

	return {
		commits: buildCommitEntries(commits, (revisionData ?? []) as RevisionRow[], profiles),
		nextCursor: nextCommitCursor(commits),
		hasMore: commits.length === limit,
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
	const { data, error } = await supabase
		.from("pages-history")
		.select("id, content")
		.eq("page_id", pageId)
		.lte("id", revisionId)
		.order("id", { ascending: false })
		.limit(2);

	if (error) return { ...EMPTY_REVISION, errorMessage: error.message };

	const rows = (data ?? []) as { id: number; content: unknown }[];
	const revision = rows.find((row) => row.id === revisionId);
	if (!revision) {
		return { ...EMPTY_REVISION, errorMessage: "That revision is no longer available." };
	}

	const parent = rows.find((row) => row.id !== revisionId) ?? null;

	return {
		revisionValues: deserializePageEditorValues(revision.content),
		parentValues: parent ? deserializePageEditorValues(parent.content) : {},
		isFirstRevision: parent === null,
		errorMessage: null
	};
}
