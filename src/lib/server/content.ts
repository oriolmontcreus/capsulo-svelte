import { env } from "cloudflare:workers";
import type { D1PreparedStatement } from "@cloudflare/workers-types/index.ts";

import { HttpError, isRecord, nowIso, requireString } from "./http";

const CONTENT_FORMAT_VERSION = 1;
const GLOBALS_ID = "globals";

// D1 free plan: 50 statements per invocation, 100 bound parameters per statement.
const MAX_PAGES_PER_COMMIT = 200;
const PAGE_UPSERT_ROWS_PER_STATEMENT = 20; // 5 params per row
const HISTORY_ROWS_PER_STATEMENT = 14; // 7 params per row
const MAX_DOCUMENT_BYTES = 1_900_000; // D1 rows are capped at 2 MB

function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
	return chunks;
}

/** Serializes a client document, enforcing the shape the tables' CHECK constraints expect. */
function serializeDocument(content: unknown, field: string): string {
	if (!isRecord(content)) throw new HttpError(400, `"${field}" must be a JSON object.`);
	const serialized = JSON.stringify(content);
	if (serialized.length > MAX_DOCUMENT_BYTES) throw new HttpError(413, `"${field}" is too large.`);
	return serialized;
}

export type StoredDocument = { content: unknown; updatedAt: string };

export async function getPage(pageId: string): Promise<StoredDocument | null> {
	const row = await env.DB.prepare("SELECT content, updated_at FROM pages WHERE page_id = ?")
		.bind(pageId)
		.first<{ content: string; updated_at: string }>();
	return row ? { content: JSON.parse(row.content), updatedAt: row.updated_at } : null;
}

/**
 * Writes every page of a commit in one atomic D1 batch: the commit row, the current
 * documents (upsert) and one immutable history snapshot per page.
 */
export async function commitPages(
	userId: string,
	rawMessage: unknown,
	rawPages: unknown
): Promise<{ commitId: string; updatedAt: string }> {
	const message = requireString(rawMessage, "message", 10_000).trim();
	if (!Array.isArray(rawPages) || rawPages.length === 0) throw new HttpError(400, '"pages" must be a non-empty array.');
	if (rawPages.length > MAX_PAGES_PER_COMMIT) throw new HttpError(400, "Too many pages in one commit.");

	const seen = new Set<string>();
	const pages = rawPages.map((entry, index) => {
		if (!isRecord(entry)) throw new HttpError(400, `pages[${index}] must be an object.`);
		const pageId = requireString(entry.pageId, `pages[${index}].pageId`, 300);
		if (seen.has(pageId)) throw new HttpError(400, `Page "${pageId}" appears twice.`);
		seen.add(pageId);
		return { pageId, content: serializeDocument(entry.content, `pages[${index}].content`) };
	});

	const commitId = crypto.randomUUID();
	const updatedAt = nowIso();
	const statements: D1PreparedStatement[] = [
		env.DB.prepare("INSERT INTO commits (id, message, created_by, created_at) VALUES (?, ?, ?, ?)").bind(
			commitId,
			message,
			userId,
			updatedAt
		)
	];

	for (const group of chunk(pages, PAGE_UPSERT_ROWS_PER_STATEMENT)) {
		statements.push(
			env.DB.prepare(
				`INSERT INTO pages (page_id, content, created_by, updated_by, updated_at)
				 VALUES ${group.map(() => "(?, ?, ?, ?, ?)").join(", ")}
				 ON CONFLICT (page_id) DO UPDATE SET
				   content = excluded.content,
				   content_format_version = ${CONTENT_FORMAT_VERSION},
				   updated_by = excluded.updated_by,
				   updated_at = excluded.updated_at`
			).bind(...group.flatMap((page) => [page.pageId, page.content, userId, userId, updatedAt]))
		);
	}

	for (const group of chunk(pages, HISTORY_ROWS_PER_STATEMENT)) {
		statements.push(
			env.DB.prepare(
				`INSERT INTO pages_history (page_id, content, comment, commit_id, created_by, created_at, content_format_version)
				 VALUES ${group.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ")}`
			).bind(
				...group.flatMap((page) => [
					page.pageId,
					page.content,
					message,
					commitId,
					userId,
					updatedAt,
					CONTENT_FORMAT_VERSION
				])
			)
		);
	}

	await env.DB.batch(statements);
	return { commitId, updatedAt };
}

export type CommitListRow = { id: string; message: string; created_by: string | null; created_at: string };
export type RevisionListRow = { id: number; page_id: string; created_at: string; commit_id: string | null };
export type AuthorRow = { id: string; name: string | null; avatar_url: string | null };

/** One keyset page of commits (newest first) plus the revisions and authors they reference. */
export async function listCommits(
	cursor: string | null,
	limit: number
): Promise<{ commits: CommitListRow[]; revisions: RevisionListRow[]; authors: AuthorRow[] }> {
	const commitQuery = cursor
		? env.DB.prepare(
				"SELECT id, message, created_by, created_at FROM commits WHERE created_at < ? ORDER BY created_at DESC LIMIT ?"
			).bind(cursor, limit)
		: env.DB.prepare("SELECT id, message, created_by, created_at FROM commits ORDER BY created_at DESC LIMIT ?").bind(
				limit
			);
	const { results: commits } = await commitQuery.all<CommitListRow>();
	if (commits.length === 0) return { commits, revisions: [], authors: [] };

	// json_each keeps the id list in a single bound parameter regardless of page size.
	const commitIds = JSON.stringify(commits.map((commit) => commit.id));
	const authorIds = JSON.stringify([...new Set(commits.map((commit) => commit.created_by).filter(Boolean))]);
	const [revisions, authors] = await env.DB.batch([
		env.DB.prepare(
			"SELECT id, page_id, created_at, commit_id FROM pages_history WHERE commit_id IN (SELECT value FROM json_each(?))"
		).bind(commitIds),
		env.DB.prepare("SELECT id, name, avatar_url FROM users WHERE id IN (SELECT value FROM json_each(?))").bind(
			authorIds
		)
	]);

	return {
		commits,
		revisions: revisions.results as RevisionListRow[],
		authors: authors.results as AuthorRow[]
	};
}

/** The revision and the one before it for the same page: both sides of a history diff. */
export async function getRevisionWithParent(
	pageId: string,
	revisionId: number
): Promise<{ id: number; content: unknown }[]> {
	const { results } = await env.DB.prepare(
		"SELECT id, content FROM pages_history WHERE page_id = ? AND id <= ? ORDER BY id DESC LIMIT 2"
	)
		.bind(pageId, revisionId)
		.all<{ id: number; content: string }>();
	return results.map((row) => ({ id: row.id, content: JSON.parse(row.content) }));
}

export async function getGlobals(): Promise<StoredDocument | null> {
	const row = await env.DB.prepare("SELECT content, updated_at FROM globals WHERE id = ?")
		.bind(GLOBALS_ID)
		.first<{ content: string; updated_at: string }>();
	return row ? { content: JSON.parse(row.content), updatedAt: row.updated_at } : null;
}

export async function saveGlobals(userId: string, content: unknown): Promise<{ updatedAt: string }> {
	const updatedAt = nowIso();
	await env.DB.prepare(
		`INSERT INTO globals (id, content, created_by, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT (id) DO UPDATE SET
		   content = excluded.content,
		   updated_by = excluded.updated_by,
		   updated_at = excluded.updated_at`
	)
		.bind(GLOBALS_ID, serializeDocument(content, "content"), userId, userId, updatedAt)
		.run();
	return { updatedAt };
}

/**
 * Everything the static build needs: published pages + globals as the stored JSON
 * text (spliced in without parsing, to stay cheap on CPU) and the uploaded file keys.
 */
export async function exportPublishedContent(): Promise<string> {
	const [pages, globals, uploads] = await env.DB.batch([
		env.DB.prepare("SELECT page_id, content FROM pages ORDER BY page_id"),
		env.DB.prepare("SELECT content FROM globals WHERE id = ?").bind(GLOBALS_ID),
		env.DB.prepare("SELECT key, content_type FROM uploads ORDER BY key")
	]);

	const pageEntries = (pages.results as { page_id: string; content: string }[])
		.map((row) => `${JSON.stringify(row.page_id)}:${row.content}`)
		.join(",");
	const globalsContent = (globals.results as { content: string }[])[0]?.content ?? "null";

	return `{"formatVersion":${CONTENT_FORMAT_VERSION},"exportedAt":${JSON.stringify(nowIso())},"pages":{${pageEntries}},"globals":${globalsContent},"uploads":${JSON.stringify(uploads.results)}}`;
}
