import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import { getLocaleFromPathname } from "$lib/i18n/routing";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

export const cmsStore = $state({
	active: false,
	pageId: "",
	locale: DEFAULT_LOCALE,
	valuesByInstance: {} as PageEditorValuesByInstance
});

export function syncSiteLocaleFromPathname(pathname: string): void {
	cmsStore.locale = getLocaleFromPathname(pathname);
}

export function resetPreviewStore(): void {
	cmsStore.active = false;
	cmsStore.pageId = "";
	cmsStore.valuesByInstance = {};
}

export function applyPreviewSync(
	pageId: string,
	locale: string,
	valuesByInstance: PageEditorValuesByInstance
): void {
	cmsStore.active = true;
	cmsStore.pageId = pageId;
	cmsStore.locale = locale;
	cmsStore.valuesByInstance = valuesByInstance;
}
