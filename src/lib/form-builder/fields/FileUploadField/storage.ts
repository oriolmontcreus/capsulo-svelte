import { CAPSULO_API_BASE, capsuloFetch, jsonBody } from "$lib/api/capsulo-client";

/**
 * Uploads a single file (stored in the project's KV namespace) and returns its key,
 * `<32 hex chars>-<file name>`. The key is what gets persisted in the form value.
 */
export async function uploadFile(file: File): Promise<string> {
	const { data, error } = await capsuloFetch<{ key: string }>("/uploads", {
		method: "POST",
		body: file,
		headers: {
			"Content-Type": file.type || "application/octet-stream",
			"X-File-Name": encodeURIComponent(file.name)
		}
	});
	if (error !== null) throw new Error(`Failed to upload "${file.name}": ${error}`);
	return data.key;
}

/**
 * Permanently removes uploads. Unknown keys are ignored.
 */
export async function removeFiles(paths: string[]): Promise<void> {
	if (paths.length === 0) return;
	const { error } = await capsuloFetch("/uploads", { method: "DELETE", body: jsonBody({ keys: paths }) });
	if (error !== null) throw new Error(`Failed to remove files: ${error}`);
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
