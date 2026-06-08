import { defineMiddleware } from "astro:middleware";

import capsuloConfig from "../capsulo.config";
import { getI18nConfig } from "$lib/config/i18n-config";

const i18nConfig = getI18nConfig(capsuloConfig);

function isAdminPathname(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return firstSegment.startsWith("admin-");
}

/**
 * Admin routes live at unprefixed `/admin/*` while public pages use injected
 * `/{locale}/*` routes and config redirects. Astro i18n rejects `/admin` when
 * `prefixDefaultLocale` is enabled, so we opt out of it entirely.
 */
export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  if (isAdminPathname(pathname)) return next();

  if (i18nConfig.prefixDefaultLocale && pathname === "/") {
    return context.redirect(`/${i18nConfig.defaultLocale}/`, 302);
  }

  return next();
});
