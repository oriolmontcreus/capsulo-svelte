import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

import capsuloConfig from "../../capsulo.config";
import { getI18nConfig } from "./config/i18n-config";

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
  const fileName = segments[segments.length - 1] ?? "";

  if (segments.includes("api")) return false;
  if (segments.includes("admin") || fileName.startsWith("admin")) return false;

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

        const { prefixDefaultLocale } = getI18nConfig(capsuloConfig);
        const locales = capsuloConfig.i18n.locales.map((locale) =>
          locale.trim(),
        );
        const pagesDir = path.join(fileURLToPath(config.root), "src", "pages");
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
          fileURLToPath(dir),
          capsuloConfig.i18n.defaultLocale.trim(),
          pagesDir,
        );
      },
    },
  };
}
