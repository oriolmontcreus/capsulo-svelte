import fs from "node:fs";
import path from "node:path";

import type { ResolvedI18nConfig } from "../../lib/config/i18n-resolve";

type PageRoute = {
  pattern: string;
  entrypoint: string;
};

function normalizeSlashes(value: string): string {
  return value.replaceAll("\\", "/");
}

function isAstroPage(relativePath: string): boolean {
  return relativePath.endsWith(".astro");
}

function isPublicPage(relativePath: string): boolean {
  if (!isAstroPage(relativePath)) return false;

  const segments = relativePath.split("/");

  if (segments.includes("api")) return false;

  return true;
}

function getUrlPathFromFile(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.astro$/, "");
  const withoutIndex = withoutExt.replace(/\/index$/, "");

  if (withoutIndex === "index" || withoutIndex === "") return "/";

  return `/${withoutIndex}`;
}

function listAstroPageFiles(pagesDir: string): string[] {
  if (!fs.existsSync(pagesDir)) {
    return [];
  }

  const files: string[] = [];

  function walk(dirPath: string): void {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      files.push(fullPath);
    }
  }

  walk(pagesDir);

  return files;
}

function listPageRoutes(
  pagesDir: string,
  matches: (relativePath: string) => boolean,
): PageRoute[] {
  const routes: PageRoute[] = [];

  for (const filePath of listAstroPageFiles(pagesDir)) {
    const relativePath = normalizeSlashes(path.relative(pagesDir, filePath));
    if (!matches(relativePath)) continue;

    routes.push({
      pattern: getUrlPathFromFile(relativePath),
      // Relative to the project root, which is how Astro resolves a string entrypoint.
      entrypoint: `./src/pages/${relativePath}`,
    });
  }

  return routes;
}

function listPublicPageRoutes(pagesDir: string): PageRoute[] {
  return listPageRoutes(pagesDir, isPublicPage);
}

function buildLocalizedPattern(locale: string, urlPath: string): string {
  if (urlPath === "/") return `/${locale}`;
  return `/${locale}${urlPath}`;
}

/**
 * Redirects unprefixed public paths to the default locale when all locales use a prefix.
 * Root `/` is handled by Astro `redirectToDefaultLocale`.
 */
export function buildUnprefixedLocaleRedirects(
  defaultLocale: string,
  pagesDir: string,
): Record<string, string> {
  const redirects: Record<string, string> = {};

  for (const page of listPublicPageRoutes(pagesDir)) {
    if (page.pattern === "/") continue;

    redirects[page.pattern] = buildLocalizedPattern(
      defaultLocale,
      page.pattern,
    );
  }

  return redirects;
}

/** The locale-prefixed copies of every site page: one .astro file serves `/{locale}/page`. */
export function listLocalizedPageRoutes(i18n: ResolvedI18nConfig, pagesDir: string): PageRoute[] {
  const publicPages = listPublicPageRoutes(pagesDir);
  const routes: PageRoute[] = [];

  for (const locale of i18n.locales) {
    if (!i18n.prefixDefaultLocale && locale === i18n.defaultLocale) continue;
    for (const page of publicPages) {
      routes.push({ pattern: buildLocalizedPattern(locale, page.pattern), entrypoint: page.entrypoint });
    }
  }

  return routes;
}

/** `_redirects` for static hosts: unprefixed paths go to the default locale. */
export function writeStaticRedirectsFile(
  outputDir: string,
  defaultLocale: string,
  pagesDir: string,
): void {
  const redirects = buildUnprefixedLocaleRedirects(defaultLocale, pagesDir);
  const lines = Object.entries(redirects).map(
    ([from, to]) => `${from}  ${to}  302`,
  );

  // Root is handled by Astro redirectToDefaultLocale; include for static hosts anyway.
  lines.unshift(`/  /${defaultLocale}/  302`);

  fs.writeFileSync(
    path.join(outputDir, "_redirects"),
    `${lines.join("\n")}\n`,
    "utf-8",
  );
}
