import {
	loadPageEditorDocumentFromDb,
	loadPageEditorDocumentMetadataFromDb
} from "$lib/PageEditor/page-editor-documents";
import {
	loadPageEditorDocumentFromCache,
	savePageEditorDocumentToCache
} from "$lib/PageEditor/page-editor-cache";

function isRemoteTimestampNewer(
	remoteUpdatedAt: string | null,
	cacheUpdatedAt: string | null
): boolean {
	if (!remoteUpdatedAt) return false;
	if (!cacheUpdatedAt) return true;

	const remoteMs = Date.parse(remoteUpdatedAt);
	const cacheMs = Date.parse(cacheUpdatedAt);
	if (Number.isNaN(remoteMs) || Number.isNaN(cacheMs)) {
		return remoteUpdatedAt !== cacheUpdatedAt;
	}

	return remoteMs > cacheMs;
}

function scheduleIdle(callback: () => void): void {
	if ("requestIdleCallback" in globalThis) {
		globalThis.requestIdleCallback(() => callback());
		return;
	}

	globalThis.setTimeout(callback, 350);
}

export function initPageEditorIndexPrefetch(): void {
	const prefetchedPageIds = new Set<string>();

	async function prefetchPageEditorData(pageId: string): Promise<void> {
		if (!pageId || prefetchedPageIds.has(pageId)) return;
		prefetchedPageIds.add(pageId);

		try {
			const cachedDocument = await loadPageEditorDocumentFromCache(pageId);

			if (cachedDocument) {
				const metadataResult = await loadPageEditorDocumentMetadataFromDb(pageId);
				if (metadataResult.errorMessage) return;
				if (!isRemoteTimestampNewer(metadataResult.updatedAt, cachedDocument.updatedAt)) {
					return;
				}
			}

			const loadResult = await loadPageEditorDocumentFromDb(pageId);
			if (loadResult.errorMessage) return;

			await savePageEditorDocumentToCache({
				pageId,
				valuesByInstance: loadResult.valuesByInstance,
				updatedAt: loadResult.updatedAt
			});
		} catch {
			// Best-effort prefetch. Ignore failures to avoid affecting navigation.
		}
	}

	const links = Array.from(document.querySelectorAll("[data-page-editor-link]"));
	for (const link of links) {
		const pageId = link.getAttribute("data-page-id");
		if (!pageId) continue;

		const warm = () => void prefetchPageEditorData(pageId);
		link.addEventListener("mouseenter", warm, { once: true });
		link.addEventListener("focus", warm, { once: true });
		link.addEventListener("touchstart", warm, { once: true });
	}

	scheduleIdle(() => {
		for (const link of links) {
			const pageId = link.getAttribute("data-page-id");
			if (!pageId) continue;
			void prefetchPageEditorData(pageId);
		}
	});
}
