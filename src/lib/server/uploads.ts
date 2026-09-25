import { env, waitUntil } from "cloudflare:workers";
import type { ReadableStream as WorkersReadableStream } from "@cloudflare/workers-types/index.ts";

import { HttpError } from "./http";

/**
 * Uploaded files live in an R2 bucket (`UPLOADS_BUCKET`) when the project has one, and
 * in the KV namespace (`UPLOADS`) otherwise. KV is the default because it needs no
 * payment method on the Cloudflare account; R2 takes much bigger files. A project moved
 * with `capsulo storage r2` keeps its KV binding, which is then only read as a fallback
 * for files that were not copied yet.
 */
function storage() {
	return { bucket: env.UPLOADS_BUCKET, namespace: env.UPLOADS };
}

/**
 * Files upload as soon as an editor picks them and only become content once a draft
 * referencing them is committed. Drafts live in the browser, so the server cannot see
 * them: an unreferenced upload is only removed after this grace period, which gives
 * editors time to commit (or recover) a draft.
 */
const UNUSED_UPLOAD_GRACE_MS = 30 * 24 * 60 * 60 * 1000;
/** Keeps each cleanup well inside the free plan's per-request subrequest budget. */
const UNUSED_UPLOADS_PER_CLEANUP = 25;

/**
 * SQL condition that is true when upload `u` is referenced by published content.
 * Keys are unique and never need JSON escaping, so a substring match on the stored
 * JSON is exact.
 */
const REFERENCED_BY_CONTENT = `(
	EXISTS (SELECT 1 FROM pages WHERE instr(pages.content, u.key) > 0)
	OR EXISTS (SELECT 1 FROM globals WHERE instr(globals.content, u.key) > 0)
)`;

type UploadMetadata = { contentType: string; fileName: string };

function sanitizeFileName(name: string): string {
	const safe = name.trim().toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-");
	return safe.replace(/^-+|-+$/g, "").slice(0, 120) || "file";
}

/** Keys are `<32 hex chars>-<file name>`; `fileNameFromPath` on the client relies on that shape. */
function isUploadKey(key: string): boolean {
	return /^[0-9a-f]{32}-[a-z0-9.\-_]+$/.test(key);
}

/** Streams the request body into the upload storage and records it in D1. Returns the new key. */
export async function storeUpload(request: Request, userId: string): Promise<string> {
	const size = Number(request.headers.get("Content-Length") ?? NaN);
	if (!Number.isFinite(size) || size <= 0) throw new HttpError(411, "Content-Length is required.");
	const { bucket, namespace } = storage();
	// KV's per-value limit, or the Workers request body limit on the Free and Pro plans.
	const maxMb = bucket ? 100 : 25;
	if (size > maxMb * 1024 * 1024) throw new HttpError(413, `Files are limited to ${maxMb} MB.`);
	if (!request.body) throw new HttpError(400, "Empty upload.");

	const rawName = decodeURIComponent(request.headers.get("X-File-Name") ?? "file");
	const fileName = sanitizeFileName(rawName);
	const contentType = request.headers.get("Content-Type") || "application/octet-stream";
	const key = `${crypto.randomUUID().replaceAll("-", "")}-${fileName}`;

	const metadata: UploadMetadata = { contentType, fileName: rawName.slice(0, 200) };
	// Same stream at runtime; the DOM and Workers typings just disagree.
	const body = request.body as unknown as WorkersReadableStream;
	if (bucket) {
		await bucket.put(key, body, { httpMetadata: { contentType }, customMetadata: { fileName: metadata.fileName } });
	} else if (namespace) {
		await namespace.put(key, body, { metadata });
	} else {
		throw new HttpError(500, "No upload storage is configured (UPLOADS or UPLOADS_BUCKET).");
	}
	await env.DB.prepare(
		"INSERT INTO uploads (key, file_name, content_type, size, created_by) VALUES (?, ?, ?, ?, ?)"
	)
		.bind(key, metadata.fileName, contentType, size, userId)
		.run();
	return key;
}

async function deleteUploads(keys: string[]): Promise<void> {
	const validKeys = keys.filter(isUploadKey);
	if (validKeys.length === 0) return;
	const { bucket, namespace } = storage();
	await Promise.all([
		bucket?.delete(validKeys),
		...(namespace ? validKeys.map((key) => namespace.delete(key)) : [])
	]);
	await env.DB.prepare("DELETE FROM uploads WHERE key IN (SELECT value FROM json_each(?))")
		.bind(JSON.stringify(validKeys))
		.run();
}

async function readStoredFile(key: string): Promise<{ body: ReadableStream; contentType?: string } | null> {
	const { bucket, namespace } = storage();
	const object = await bucket?.get(key);
	if (object) {
		return { body: object.body as unknown as ReadableStream, contentType: object.httpMetadata?.contentType };
	}
	if (!namespace) return null;
	const { value, metadata } = await namespace.getWithMetadata<UploadMetadata>(key, "stream");
	return value ? { body: value as unknown as ReadableStream, contentType: metadata?.contentType } : null;
}

export async function readUpload(key: string): Promise<Response | null> {
	if (!isUploadKey(key)) return null;
	const file = await readStoredFile(key);
	if (!file) return null;
	return new Response(file.body, {
		headers: {
			"Content-Type": file.contentType ?? "application/octet-stream",
			// Keys are unique per upload and never rewritten.
			"Cache-Control": "public, max-age=31536000, immutable",
			"X-Content-Type-Options": "nosniff",
			"Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
		}
	});
}

/** Upload keys the published pages and globals use: what the static build has to ship. */
export const PUBLISHED_UPLOADS_QUERY = `SELECT key, content_type FROM uploads u WHERE ${REFERENCED_BY_CONTENT} ORDER BY key`;

/**
 * Deletes uploads that are past the grace period and referenced by neither published
 * content nor any page revision (so recovering an old revision keeps its files).
 */
async function deleteUnusedUploads(): Promise<void> {
	const cutoff = new Date(Date.now() - UNUSED_UPLOAD_GRACE_MS).toISOString();
	const { results } = await env.DB.prepare(
		`SELECT key FROM uploads u
		 WHERE u.created_at < ?
		   AND NOT ${REFERENCED_BY_CONTENT}
		   AND NOT EXISTS (SELECT 1 FROM pages_history WHERE instr(pages_history.content, u.key) > 0)
		 ORDER BY u.created_at
		 LIMIT ?`
	)
		.bind(cutoff, UNUSED_UPLOADS_PER_CLEANUP)
		.all<{ key: string }>();
	await deleteUploads(results.map((row) => row.key));
}

/** Runs the unused-upload cleanup after the response, without failing the request. */
export function scheduleUnusedUploadCleanup(): void {
	waitUntil(deleteUnusedUploads().catch((error) => console.error("[capsulo] Upload cleanup failed:", error)));
}
