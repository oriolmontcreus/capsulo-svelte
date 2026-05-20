import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

export const PAGE_EDITOR_PREVIEW_PARAM = "pageEditorPreview";
export const PAGE_EDITOR_PREVIEW_CHANNEL = "page-editor-preview";

export type PageEditorPreviewSyncMessage = {
	channel: typeof PAGE_EDITOR_PREVIEW_CHANNEL;
	type: "state-sync";
	pageId: string;
	locale: string;
	valuesByInstance: PageEditorValuesByInstance;
};

export type PageEditorPreviewReadyMessage = {
	channel: typeof PAGE_EDITOR_PREVIEW_CHANNEL;
	type: "ready";
	pageId: string;
};

export type PageEditorPreviewMessage =
	| PageEditorPreviewSyncMessage
	| PageEditorPreviewReadyMessage;

export function isPageEditorPreviewMessage(value: unknown): value is PageEditorPreviewMessage {
	if (!value || typeof value !== "object") return false;
	const maybeMessage = value as Partial<PageEditorPreviewMessage>;
	return (
		maybeMessage.channel === PAGE_EDITOR_PREVIEW_CHANNEL &&
		(maybeMessage.type === "state-sync" || maybeMessage.type === "ready") &&
		typeof maybeMessage.pageId === "string"
	);
}
