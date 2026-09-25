import { defineMiddleware } from "astro:middleware";

import capsuloConfig from "../capsulo.config";
import { syncSiteLocaleFromPathname } from "$lib/cms/cms-store.svelte";
import { setServerPublishedValues } from "$lib/cms/published";
import { getI18nConfig } from "$lib/config/i18n-config";
import { pathnameToPageId } from "$lib/i18n/routing";
import { deserializePageEditorValues } from "$lib/PageEditor/persistence";

const i18nConfig = getI18nConfig(capsuloConfig);

function isAdminPathname(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return firstSegment.startsWith("admin-");
}

/**
 * Seeds the published CMS values and the locale for the page about to render. This
 * must happen here rather than in Layout.astro: Astro renders slot children (the
 * capsule islands) eagerly, possibly before the layout's frontmatter runs.
 */
async function seedPublishedContent(url: URL): Promise<void> {
  const { loadPublishedContent } = await import("virtual:capsulo/published");
  const { pages } = await loadPublishedContent(url);
  setServerPublishedValues(deserializePageEditorValues(pages[pathnameToPageId(url.pathname)]));
  syncSiteLocaleFromPathname(url.pathname);
}

/**
 * Admin routes live at unprefixed `/admin/*` while public pages use injected
 * `/{locale}/*` routes and config redirects. Astro i18n rejects `/admin` when
 * `prefixDefaultLocale` is enabled, so we opt out of it entirely.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (isAdminPathname(pathname)) return next();
  if (pathname.startsWith("/api/")) return next();

  if (i18nConfig.prefixDefaultLocale && pathname === "/") {
    return context.redirect(`/${i18nConfig.defaultLocale}/`, 302);
  }

  // Public pages are prerendered (at build time, or per request in `astro dev`).
  if (context.isPrerendered) await seedPublishedContent(context.url);

  return next();
});
