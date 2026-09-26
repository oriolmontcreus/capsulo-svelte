/**
 * Stand-in for `src/lib/form-builder/fields/FileUploadField/storage.ts` in the live
 * previews (swapped in by `vite-plugin-preview-mocks.ts`). The docs have no Worker to
 * upload to, so picked files stay in the browser as object URLs and nothing is sent
 * anywhere. Keys keep the real `<32 hex chars>-<file name>` shape.
 */

const objectUrls = new Map<string, string>();

function randomHex(): string {
	return crypto.randomUUID().replaceAll('-', '');
}

export async function uploadFile(file: File, signal?: AbortSignal): Promise<string> {
	// A short pause so the preview shows the same pending state as a real upload.
	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(resolve, 400);
		signal?.addEventListener('abort', () => {
			clearTimeout(timer);
			reject(new DOMException('Upload cancelled.', 'AbortError'));
		});
	});

	const key = `${randomHex()}-${file.name}`;
	objectUrls.set(key, URL.createObjectURL(file));
	return key;
}

/** Picked files resolve to their object URL; example keys resolve to files in `public/previews/`. */
export function mediaUrl(path: string, _source: 'live' | 'published' = 'live'): string {
	return objectUrls.get(path) ?? `/previews/${encodeURIComponent(fileNameFromPath(path))}`;
}

export function fileNameFromPath(path: string): string {
	const last = path.split('/').pop() ?? path;
	const dashIndex = last.indexOf('-');
	return dashIndex >= 0 ? last.slice(dashIndex + 1) : last;
}
