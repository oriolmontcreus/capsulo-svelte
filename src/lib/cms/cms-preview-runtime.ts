import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import { loadPageEditorDocumentFromCache } from "$lib/PageEditor/page-editor-cache";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
import {
	PAGE_EDITOR_PREVIEW_CHANNEL,
	type PageEditorPreviewReadyMessage,
	type PageEditorPreviewSyncMessage,
	isPageEditorPreviewMessage
} from "$lib/PageEditor/preview-channel";

import { applyPreviewSync } from "./preview-store.svelte";

let runtimeTeardown: (() => void) | null = null;

export async function initCmsPreview(pageId: string): Promise<void> {
	if (typeof window === "undefined") return;
	teardownCmsPreview();

	let locale = DEFAULT_LOCALE;
	let valuesByInstance: PageEditorValuesByInstance = {};

	const cachedDocument = await loadPageEditorDocumentFromCache(pageId);
	if (cachedDocument?.valuesByInstance) {
		valuesByInstance = cachedDocument.valuesByInstance;
	}
	applyPreviewSync(pageId, locale, valuesByInstance);

	const handleMessage = (event: MessageEvent<unknown>) => {
		if (event.origin !== window.location.origin) return;
		if (!isPageEditorPreviewMessage(event.data)) return;
		if (event.data.type !== "state-sync") return;
		if (event.data.pageId !== pageId) return;

		const message = event.data as PageEditorPreviewSyncMessage;
		applyPreviewSync(pageId, message.locale, message.valuesByInstance);
	};

	window.addEventListener("message", handleMessage);
	runtimeTeardown = () => {
		window.removeEventListener("message", handleMessage);
		runtimeTeardown = null;
	};

	const readyMessage: PageEditorPreviewReadyMessage = {
		channel: PAGE_EDITOR_PREVIEW_CHANNEL,
		type: "ready",
		pageId
	};
	window.parent.postMessage(readyMessage, window.location.origin);
}

export function teardownCmsPreview(): void {
	runtimeTeardown?.();
}
