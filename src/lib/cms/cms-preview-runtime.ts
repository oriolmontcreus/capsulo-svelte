import { loadPageEditorDocumentFromCache } from "$lib/PageEditor/page-editor-cache";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
import {
	PAGE_EDITOR_PREVIEW_CHANNEL,
	type PageEditorPreviewReadyMessage,
	type PageEditorPreviewSyncMessage,
	isPageEditorPreviewMessage
} from "$lib/PageEditor/preview-channel";

import { applyPreviewSync, cmsStore } from "./cms-store.svelte";

let runtimeTeardown: (() => void) | null = null;
let resizeObserver: ResizeObserver | null = null;
let islandMutationObserver: MutationObserver | null = null;
let reflowTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Forces the Astro Dev Toolbar to recalculate island bounding boxes
 * by (1) touching the DOM to force reflow and (2) dispatching a resize event.
 * Debounced so rapid successive calls only trigger one reflow.
 */
function forceDevToolbarReflow(): void {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	if (reflowTimeout) clearTimeout(reflowTimeout);

	reflowTimeout = setTimeout(() => {
		reflowTimeout = null;

		// Schedule after the next paint so Svelte has already updated the DOM
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				// Force reflow on every <astro-island> by reading a layout property
				const islands = document.querySelectorAll("astro-island");
				for (const island of islands) {
					void (island as HTMLElement).offsetHeight;
				}
				window.dispatchEvent(new Event("resize"));
			});
		});
	}, 1000);
}

/**
 * Sets up a ResizeObserver that watches every <astro-island> and forces
 * a Dev Toolbar reflow whenever any island changes size.
 */
function setupIslandResizeObserver(): void {
	if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return;
	if (resizeObserver) resizeObserver.disconnect();

	resizeObserver = new ResizeObserver((entries) => {
		if (entries.length === 0) return;
		// Debounce: only trigger once per "burst" of resize notifications
		forceDevToolbarReflow();
	});

	const islands = document.querySelectorAll("astro-island");
	for (const island of islands) {
		resizeObserver.observe(island);
	}

	// Also watch for newly added islands (e.g. after navigation)
	islandMutationObserver?.disconnect();
	islandMutationObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node instanceof HTMLElement && node.tagName === "ASTRO-ISLAND") {
					resizeObserver?.observe(node);
				}
			}
		}
	});

	islandMutationObserver.observe(document.body, { childList: true, subtree: true });

	// Store teardown so we can clean it up
	const originalTeardown = runtimeTeardown;
	runtimeTeardown = () => {
		originalTeardown?.();
		resizeObserver?.disconnect();
		resizeObserver = null;
		islandMutationObserver?.disconnect();
		islandMutationObserver = null;
		if (reflowTimeout) {
			clearTimeout(reflowTimeout);
			reflowTimeout = null;
		}
	};
}

export async function initCmsPreview(pageId: string): Promise<void> {
	if (typeof window === "undefined") return;
	teardownCmsPreview();

	let valuesByInstance: PageEditorValuesByInstance = {};

	const cachedDocument = await loadPageEditorDocumentFromCache(pageId);
	if (cachedDocument?.valuesByInstance) {
		valuesByInstance = cachedDocument.valuesByInstance;
	}
	applyPreviewSync(pageId, cmsStore.locale, valuesByInstance);

	// Watch islands for size changes and force Dev Toolbar reflow
	setupIslandResizeObserver();
	forceDevToolbarReflow();

	const handleMessage = (event: MessageEvent<unknown>) => {
		if (event.origin !== window.location.origin) return;
		if (!isPageEditorPreviewMessage(event.data)) return;
		if (event.data.type !== "state-sync") return;
		if (event.data.pageId !== pageId) return;

		const message = event.data as PageEditorPreviewSyncMessage;
		applyPreviewSync(pageId, message.locale, message.valuesByInstance);

		// After CMS data changes, islands will resize — force reflow
		forceDevToolbarReflow();
	};

	window.addEventListener("message", handleMessage);

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
