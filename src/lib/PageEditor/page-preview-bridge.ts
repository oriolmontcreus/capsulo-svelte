import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import { loadPageEditorDocumentFromCache } from "$lib/PageEditor/page-editor-cache";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
import {
	PAGE_EDITOR_PREVIEW_CHANNEL,
	type PageEditorPreviewReadyMessage,
	type PageEditorPreviewSyncMessage,
	isPageEditorPreviewMessage
} from "$lib/PageEditor/preview-channel";

type PreviewState = {
	locale: string;
	valuesByInstance: PageEditorValuesByInstance;
};

let bridgeTeardown: (() => void) | null = null;

function resolveFieldValue(
	state: PreviewState,
	instanceId: string,
	fieldName: string
): unknown {
	return state.valuesByInstance?.[instanceId]?.[fieldName]?.[state.locale];
}

function applyPreviewStateToDom(state: PreviewState): void {
	const boundNodes = document.querySelectorAll<HTMLElement>("[data-cms-instance][data-cms-field]");
	for (const node of boundNodes) {
		const instanceId = node.dataset.cmsInstance;
		const fieldName = node.dataset.cmsField;
		if (!instanceId || !fieldName) continue;

		const value = resolveFieldValue(state, instanceId, fieldName);
		const nextValue = value == null ? "" : String(value);
		const targetAttr = node.dataset.cmsAttr;

		if (targetAttr) {
			node.setAttribute(targetAttr, nextValue);
			continue;
		}

		node.textContent = nextValue;
	}
}

export async function initPagePreviewBridge(pageId: string): Promise<void> {
	if (typeof window === "undefined") return;
	teardownPagePreviewBridge();

	let state: PreviewState = {
		locale: DEFAULT_LOCALE,
		valuesByInstance: {}
	};

	const cachedDocument = await loadPageEditorDocumentFromCache(pageId);
	if (cachedDocument?.valuesByInstance) {
		state = {
			locale: DEFAULT_LOCALE,
			valuesByInstance: cachedDocument.valuesByInstance
		};
		applyPreviewStateToDom(state);
	}

	const handleMessage = (event: MessageEvent<unknown>) => {
		if (event.origin !== window.location.origin) return;
		if (!isPageEditorPreviewMessage(event.data)) return;
		if (event.data.type !== "state-sync") return;
		if (event.data.pageId !== pageId) return;

		const message = event.data as PageEditorPreviewSyncMessage;
		state = {
			locale: message.locale,
			valuesByInstance: message.valuesByInstance
		};
		applyPreviewStateToDom(state);
	};
	window.addEventListener("message", handleMessage);
	bridgeTeardown = () => {
		window.removeEventListener("message", handleMessage);
		bridgeTeardown = null;
	};

	const readyMessage: PageEditorPreviewReadyMessage = {
		channel: PAGE_EDITOR_PREVIEW_CHANNEL,
		type: "ready",
		pageId
	};
	window.parent.postMessage(readyMessage, window.location.origin);
}

export function teardownPagePreviewBridge(): void {
	bridgeTeardown?.();
}
