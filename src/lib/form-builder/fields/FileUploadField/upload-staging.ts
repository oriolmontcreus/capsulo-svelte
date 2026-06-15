/**
 * Save-time flush registry for FileUpload fields.
 *
 * FileUpload components keep their add/delete operations staged locally and do
 * NOT commit them on interaction. Instead each mounted component registers a
 * `flush` callback here. The editor's Save handler calls `flushPendingUploads()`
 * before persisting, which performs the actual bucket uploads/deletes and then
 * commits the resolved value through the field's `onValueChange` (synchronously
 * updating the form state that Save reads).
 */

export type UploadFlusher = () => Promise<void>;

const flushers = new Set<UploadFlusher>();

export function registerUploadFlusher(flush: UploadFlusher): () => void {
	flushers.add(flush);
	return () => {
		flushers.delete(flush);
	};
}

/**
 * Runs every registered flusher. If one or more fail, the rest still run and an
 * aggregated error is thrown so the caller can surface it and abort the save.
 */
export async function flushPendingUploads(): Promise<void> {
	const results = await Promise.allSettled(
		Array.from(flushers, (flush) => flush()),
	);

	const errors = results
		.filter((result): result is PromiseRejectedResult => result.status === "rejected")
		.map((result) =>
			result.reason instanceof Error
				? result.reason.message
				: String(result.reason),
		);

	if (errors.length > 0) {
		throw new Error(errors.join("\n"));
	}
}
