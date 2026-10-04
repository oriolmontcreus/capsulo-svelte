import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import type { SchemaValues } from "$lib/form-builder/core/types";
import { getLocaleFromPathname } from "$lib/i18n/routing";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

export const cmsStore = $state({
	active: false,
	pageId: "",
	// Read from the URL at load so islands that hydrate before CmsPump already use the
	// page's locale (the server render sets it the same way in Layout.astro).
	locale: typeof window === "undefined" ? DEFAULT_LOCALE : getLocaleFromPathname(window.location.pathname),
	valuesByInstance: {} as PageEditorValuesByInstance,
	/** The editor's globals in preview mode; null uses the page's published variables. */
	globals: null as SchemaValues | null
});

export function syncSiteLocaleFromPathname(pathname: string): void {
	cmsStore.locale = getLocaleFromPathname(pathname);
}

export function resetPreviewStore(): void {
	cmsStore.active = false;
	cmsStore.pageId = "";
	cmsStore.valuesByInstance = {};
	cmsStore.globals = null;
}

export function applyPreviewSync(
	pageId: string,
	locale: string,
	valuesByInstance: PageEditorValuesByInstance,
	globals: SchemaValues | null = null
): void {
	cmsStore.active = true;
	cmsStore.pageId = pageId;
	cmsStore.locale = locale;
	cmsStore.valuesByInstance = valuesByInstance;
	cmsStore.globals = globals;
}
