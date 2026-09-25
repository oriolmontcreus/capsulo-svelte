import { CAPSULO_API_BASE, capsuloFetch } from "$lib/api/capsulo-client";

/**
 * Uploads a single file (stored in the project's KV namespace) and returns its key,
 * `<32 hex chars>-<file name>`. The key is what gets persisted in the form value.
 *
 * Files are uploaded as soon as they are picked, so the key can live in the local
 * draft and go through the normal review and commit flow like any other value.
 * Uploads that never get committed are removed later by the server's cleanup.
 */
export async function uploadFile(file: File, signal?: AbortSignal): Promise<string> {
	const { data, error } = await capsuloFetch<{ key: string }>("/uploads", {
		method: "POST",
		body: file,
		signal,
		headers: {
			"Content-Type": file.type || "application/octet-stream",
			"X-File-Name": encodeURIComponent(file.name)
		}
	});
	if (error !== null) throw new Error(`Failed to upload "${file.name}": ${error}`);
	return data.key;
}

/**
 * URL for an uploaded file. The public site uses the copy baked into the static build
 * (`/uploads/<key>`, free to serve); the admin and the editor preview read it through
 * the Worker, because a just-uploaded file is not in the deployed build yet.
 */
export function mediaUrl(path: string, source: "live" | "published" = "live"): string {
	const encoded = encodeURIComponent(path);
	return source === "published" ? `/uploads/${encoded}` : `${CAPSULO_API_BASE}/media/${encoded}`;
}

export function fileNameFromPath(path: string): string {
	const last = path.split("/").pop() ?? path;
	const dashIndex = last.indexOf("-");
	return dashIndex >= 0 ? last.slice(dashIndex + 1) : last;
}
