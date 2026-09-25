import { env } from "cloudflare:workers";
import type { ReadableStream as WorkersReadableStream } from "@cloudflare/workers-types/index.ts";

import { HttpError } from "./http";

/** Workers KV's per-value limit. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

type UploadMetadata = { contentType: string; fileName: string };

function sanitizeFileName(name: string): string {
	const safe = name.trim().toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-");
	return safe.replace(/^-+|-+$/g, "").slice(0, 120) || "file";
}

/** Keys are `<32 hex chars>-<file name>`; `fileNameFromPath` on the client relies on that shape. */
function isUploadKey(key: string): boolean {
	return /^[0-9a-f]{32}-[a-z0-9.\-_]+$/.test(key);
}

/** Streams the request body into KV and records it in D1. Returns the new key. */
export async function storeUpload(request: Request, userId: string): Promise<string> {
	const size = Number(request.headers.get("Content-Length") ?? NaN);
	if (!Number.isFinite(size) || size <= 0) throw new HttpError(411, "Content-Length is required.");
	if (size > MAX_UPLOAD_BYTES) throw new HttpError(413, "Files are limited to 25 MB.");
	if (!request.body) throw new HttpError(400, "Empty upload.");

	const rawName = decodeURIComponent(request.headers.get("X-File-Name") ?? "file");
	const fileName = sanitizeFileName(rawName);
	const contentType = request.headers.get("Content-Type") || "application/octet-stream";
	const key = `${crypto.randomUUID().replaceAll("-", "")}-${fileName}`;

	const metadata: UploadMetadata = { contentType, fileName: rawName.slice(0, 200) };
	// Same stream at runtime; the DOM and Workers typings just disagree.
	await env.UPLOADS.put(key, request.body as unknown as WorkersReadableStream, { metadata });
	await env.DB.prepare(
		"INSERT INTO uploads (key, file_name, content_type, size, created_by) VALUES (?, ?, ?, ?, ?)"
	)
		.bind(key, metadata.fileName, contentType, size, userId)
		.run();
	return key;
}

export async function deleteUploads(keys: string[]): Promise<void> {
	const validKeys = keys.filter(isUploadKey);
	if (validKeys.length === 0) return;
	await Promise.all(validKeys.map((key) => env.UPLOADS.delete(key)));
	await env.DB.prepare("DELETE FROM uploads WHERE key IN (SELECT value FROM json_each(?))")
		.bind(JSON.stringify(validKeys))
		.run();
}

export async function readUpload(key: string): Promise<Response | null> {
	if (!isUploadKey(key)) return null;
	const { value, metadata } = await env.UPLOADS.getWithMetadata<UploadMetadata>(key, "stream");
	if (!value) return null;
	return new Response(value as unknown as ReadableStream, {
		headers: {
			"Content-Type": metadata?.contentType ?? "application/octet-stream",
			// Keys are unique per upload and never rewritten.
			"Cache-Control": "public, max-age=31536000, immutable",
			"X-Content-Type-Options": "nosniff",
			"Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
		}
	});
}
