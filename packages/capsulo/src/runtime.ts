/** `capsulo/runtime`: what site components use to read their CMS content. */
export { getCmsData } from "./lib/cms/get-cms-data";
export { cmsStore } from "./lib/cms/cms-store.svelte";
export { mediaUrl, fileNameFromPath } from "./lib/form-builder/fields/FileUploadField/storage";
export { getLocaleFromPathname, pageIdToPathname, pathnameToPageId } from "./lib/i18n/routing";
export { LOCALES, DEFAULT_LOCALE } from "./lib/config/i18n-config";
