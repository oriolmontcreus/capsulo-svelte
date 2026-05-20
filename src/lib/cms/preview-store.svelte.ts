import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

export const previewStore = $state({
	active: false,
	pageId: "",
	locale: DEFAULT_LOCALE,
	valuesByInstance: {} as PageEditorValuesByInstance
});

export function resetPreviewStore(): void {
	previewStore.active = false;
	previewStore.pageId = "";
	previewStore.locale = DEFAULT_LOCALE;
	previewStore.valuesByInstance = {};
}

export function applyPreviewSync(
	pageId: string,
	locale: string,
	valuesByInstance: PageEditorValuesByInstance
): void {
	previewStore.active = true;
	previewStore.pageId = pageId;
	previewStore.locale = locale;
	previewStore.valuesByInstance = valuesByInstance;
}
