import fs from "node:fs";
import path from "node:path";
import type { AstroIntegration } from "astro";

import capsuloConfig from "../../capsulo.config";

type PublicPageRoute = {
  pattern: string;
  entrypoint: string;
};

function normalizeSlashes(value: string): string {
  return value.replaceAll("\\", "/");
}

function isPublicPage(relativePath: string): boolean {
  const segments = relativePath.split("/");
  const fileName = segments[segments.length - 1] ?? "";

  if (segments.includes("api")) return false;
  if (segments.includes("admin") || fileName.startsWith("admin")) return false;

  return relativePath.endsWith(".astro");
}

function getUrlPathFromFile(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.astro$/, "");
  const withoutIndex = withoutExt.replace(/\/index$/, "");

  if (withoutIndex === "index" || withoutIndex === "") return "/";

  return `/${withoutIndex}`;
}

function listPublicPageRoutes(pagesDir: string): PublicPageRoute[] {
  if (!fs.existsSync(pagesDir)) {
    return [];
  }

  const routes: PublicPageRoute[] = [];
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

  for (const filePath of files) {
    const relativePath = normalizeSlashes(path.relative(pagesDir, filePath));
    if (!isPublicPage(relativePath)) continue;

    const urlPath = getUrlPathFromFile(relativePath);
    routes.push({
      pattern: urlPath,
      entrypoint: `./src/pages/${relativePath}`,
    });
  }

  return routes;
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

/**
 * Injects locale-prefixed routes for public pages so a single .astro file
 * serves every configured locale at `/{locale}/page`.
 */
function writeStaticRedirectsFile(
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

  if (lines.length === 0) return;

  fs.writeFileSync(
    path.join(outputDir, "_redirects"),
    `${lines.join("\n")}\n`,
    "utf-8",
  );
}

export function autoI18nRoutes(): AstroIntegration {
  return {
    name: "auto-i18n-routes",
    hooks: {
      "astro:config:setup": ({ injectRoute, config }) => {
        if (!config.i18n) return;

        const prefixDefaultLocale =
          config.i18n.routing?.prefixDefaultLocale ?? false;
        const locales = capsuloConfig.i18n.locales.map((locale) =>
          locale.trim(),
        );
        const pagesDir = path.join(config.root.pathname, "src", "pages");
        const publicPages = listPublicPageRoutes(pagesDir);

        for (const locale of locales) {
          if (!prefixDefaultLocale && locale === config.i18n.defaultLocale) {
            continue;
          }

          for (const page of publicPages) {
            injectRoute({
              pattern: buildLocalizedPattern(locale, page.pattern),
              entrypoint: page.entrypoint,
            });
          }
        }
      },

      "astro:build:done": ({ dir }) => {
        const prefixDefaultLocale =
          capsuloConfig.i18n.prefixDefaultLocale ?? true;
        if (!prefixDefaultLocale) return;

        const pagesDir = path.join(process.cwd(), "src", "pages");
        writeStaticRedirectsFile(
          dir.pathname,
          capsuloConfig.i18n.defaultLocale.trim(),
          pagesDir,
        );
      },
    },
  };
}
