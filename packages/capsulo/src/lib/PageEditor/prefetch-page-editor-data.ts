import {
	loadPageEditorDocumentFromDb,
	loadPageEditorDocumentMetadataFromDb
} from "./page-editor-documents";
import {
	isRemoteTimestampNewer,
	loadPageEditorDocumentFromCache,
	savePageEditorDocumentToCache
} from "./page-editor-cache";

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
}
