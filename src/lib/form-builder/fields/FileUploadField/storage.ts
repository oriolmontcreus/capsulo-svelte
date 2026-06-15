import { supabase } from "$/db/supabase";

export const UPLOADS_BUCKET = "uploads";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

function sanitizeFileName(name: string): string {
	const trimmed = name.trim().toLowerCase();
	const safe = trimmed.replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-");
	return safe.replace(/^-+|-+$/g, "") || "file";
}

async function getCurrentUserId(): Promise<string> {
	const { data, error } = await supabase.auth.getUser();
	if (error || !data.user) {
		throw new Error("You must be signed in to upload files.");
	}
	return data.user.id;
}

/**
 * Uploads a single file to `uploads/<userId>/<uuid>-<filename>` and returns the
 * stored object path. The path is what gets persisted in the form value.
 */
export async function uploadFile(file: File): Promise<string> {
	const userId = await getCurrentUserId();
	const path = `${userId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

	const { error } = await supabase.storage
		.from(UPLOADS_BUCKET)
		.upload(path, file, {
			cacheControl: "3600",
			contentType: file.type || undefined,
			upsert: false,
		});

	if (error) {
		throw new Error(`Failed to upload "${file.name}": ${error.message}`);
	}

	return path;
}

/**
 * Permanently removes objects from the bucket. Missing paths are ignored.
 */
export async function removeFiles(paths: string[]): Promise<void> {
	if (paths.length === 0) return;

	const { error } = await supabase.storage.from(UPLOADS_BUCKET).remove(paths);
	if (error) {
		throw new Error(`Failed to remove files: ${error.message}`);
	}
}

/**
 * Resolves a list of object paths into short-lived signed URLs for display
 * (the bucket is private). Returns a path -> signed URL map; paths that fail to
 * resolve are simply omitted.
 */
export async function getSignedUrls(
	paths: string[],
): Promise<Record<string, string>> {
	if (paths.length === 0) return {};

	const { data, error } = await supabase.storage
		.from(UPLOADS_BUCKET)
		.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

	if (error || !data) {
		return {};
	}

	const result: Record<string, string> = {};
	for (const item of data) {
		if (item.signedUrl && item.path) {
			result[item.path] = item.signedUrl;
		}
	}
	return result;
}
