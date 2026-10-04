import { capsuloFetch } from "../../api/capsulo-client";
import { deserializeDocumentContent } from "../page-editor-documents";
import type { PageEditorValuesByInstance } from "../persistence";
import {
	buildCommitEntries,
	nextCommitCursor,
	type CommitEntry,
	type CommitRow,
	type ProfileRow,
	type RevisionRow
} from "./history-model";
import { t } from "../../admin-i18n/i18n.svelte";
import { onAdminCacheClear } from "../../admin/admin-cache";

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
async function loadCommitPage(
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

export type CommitList = {
	commits: CommitEntry[];
	nextCursor: string | null;
	hasMore: boolean;
};

/** The list as last shown, older pages included, so returning to History renders it at once. */
let cachedCommitList: CommitList | null = null;
let inflightRevalidation: Promise<{ list: CommitList | null; errorMessage: string | null }> | null = null;

/** The commit list from the last visit (or the background warm-up), if any. */
export function peekCommitList(): CommitList | null {
	return cachedCommitList;
}

/**
 * Lays a fresh first page over the cached list. When the cached newest commit is still in it,
 * only the commits made since are added and the older pages already loaded are kept;
 * otherwise (more new commits than a page holds) the list restarts from the fresh page.
 */
function mergeFirstPage(cached: CommitList | null, fresh: LoadCommitPageResult): CommitList {
	const freshList = { commits: fresh.commits, nextCursor: fresh.nextCursor, hasMore: fresh.hasMore };
	const newestCachedId = cached?.commits[0]?.commitId;
	const overlapStart = fresh.commits.findIndex((commit) => commit.commitId === newestCachedId);
	if (!cached || overlapStart === -1) return freshList;

	const overlapLength = fresh.commits.length - overlapStart;
	if (cached.commits.length <= overlapLength) return freshList;
	return {
		commits: [...fresh.commits, ...cached.commits.slice(overlapLength)],
		nextCursor: cached.nextCursor,
		hasMore: cached.hasMore
	};
}

/**
 * Refetches the newest commits and updates the cached list. Resolves to the same list object
 * when nothing changed, so callers can skip re-rendering. Concurrent calls share one request.
 */
export function revalidateCommitList(): Promise<{ list: CommitList | null; errorMessage: string | null }> {
	inflightRevalidation ??= (async () => {
		const fresh = await loadCommitPage(null);
		if (fresh.errorMessage) return { list: cachedCommitList, errorMessage: fresh.errorMessage };

		const merged = mergeFirstPage(cachedCommitList, fresh);
		if (!cachedCommitList || JSON.stringify(merged) !== JSON.stringify(cachedCommitList)) {
			cachedCommitList = merged;
		}
		return { list: cachedCommitList, errorMessage: null };
	})().finally(() => (inflightRevalidation = null));
	return inflightRevalidation;
}

/** Loads the next (older) page onto the cached list. */
export async function loadMoreCommits(): Promise<{ list: CommitList | null; errorMessage: string | null }> {
	const current = cachedCommitList;
	if (!current?.hasMore) return { list: current, errorMessage: null };

	const result = await loadCommitPage(current.nextCursor);
	if (result.errorMessage) return { list: cachedCommitList, errorMessage: result.errorMessage };
	// A revalidation may have replaced the list meanwhile; only extend the one this page follows.
	if (cachedCommitList !== current) return { list: cachedCommitList, errorMessage: null };

	cachedCommitList = {
		commits: [...current.commits, ...result.commits],
		nextCursor: result.nextCursor,
		hasMore: result.hasMore
	};
	return { list: cachedCommitList, errorMessage: null };
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
/** Revisions never change once committed, so a loaded one is kept for the whole session. */
const revisionCache = new Map<string, LoadRevisionResult>();

function revisionKey(pageId: string, revisionId: number): string {
	return `${pageId}:${revisionId}`;
}

onAdminCacheClear(() => {
	cachedCommitList = null;
	revisionCache.clear();
});

/** A revision already loaded this session, if any. */
export function peekRevisionWithParent(pageId: string, revisionId: number): LoadRevisionResult | null {
	return revisionCache.get(revisionKey(pageId, revisionId)) ?? null;
}

export async function loadRevisionWithParent(
	pageId: string,
	revisionId: number
): Promise<LoadRevisionResult> {
	const cached = peekRevisionWithParent(pageId, revisionId);
	if (cached) return cached;

	const params = new URLSearchParams({ pageId, revisionId: String(revisionId) });
	const { data, error } = await capsuloFetch<{ revisions: { id: number; content: unknown }[] }>(
		`/revisions?${params}`
	);
	if (error !== null) return { ...EMPTY_REVISION, errorMessage: error };

	const revision = data.revisions.find((row) => row.id === revisionId);
	if (!revision) {
		return { ...EMPTY_REVISION, errorMessage: t("history.revisionUnavailable") };
	}

	const parent = data.revisions.find((row) => row.id !== revisionId) ?? null;

	const result: LoadRevisionResult = {
		revisionValues: deserializeDocumentContent(pageId, revision.content),
		parentValues: parent ? deserializeDocumentContent(pageId, parent.content) : {},
		isFirstRevision: parent === null,
		errorMessage: null
	};
	revisionCache.set(revisionKey(pageId, revisionId), result);
	return result;
}
