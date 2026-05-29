import {
	DEFAULT_LOCALE,
	isValidLocale,
	LOCALES,
	PREFIX_DEFAULT_LOCALE
} from "$lib/config/i18n-config";

/**
 * Extracts the active locale from a URL pathname.
 * The first path segment is treated as a locale when it matches a configured locale.
 */
export function getLocaleFromPathname(pathname: string): string {
	const segments = pathname.split("/").filter(Boolean);
	const firstSegment = segments[0];

	if (firstSegment && isValidLocale(firstSegment)) {
		return firstSegment;
	}

	return DEFAULT_LOCALE;
}

/**
 * Removes a leading locale prefix from a pathname (e.g. `/en/about` → `/about`).
 */
export function stripLocalePrefix(pathname: string): string {
	const localePattern = new RegExp(`^/(${LOCALES.join("|")})(?=/|$)`);
	const withoutLocale = pathname.replace(localePattern, "");

	if (!withoutLocale || withoutLocale === "") {
		return "/";
	}

	return withoutLocale.startsWith("/") ? withoutLocale : `/${withoutLocale}`;
}

/**
 * Maps a public URL pathname to a CMS page id (locale segments are ignored).
 */
export function pathnameToPageId(pathname: string): string {
	const cleanPath = stripLocalePrefix(pathname).replace(/\/+$/, "");

	if (!cleanPath || cleanPath === "/") {
		return "index";
	}

	return cleanPath
		.split("/")
		.filter(Boolean)
		.map((segment) => decodeURIComponent(segment))
		.join("/");
}

/**
 * Builds a public path for a page id. When `PREFIX_DEFAULT_LOCALE` is enabled,
 * every locale is explicit in the URL (`/es/page`, `/en/page`).
 */
export function pageIdToPathname(pageId: string, locale: string = DEFAULT_LOCALE): string {
	const normalizedPageId = pageId.trim();
	const basePath =
		!normalizedPageId || normalizedPageId === "index"
			? "/"
			: `/${normalizedPageId
					.split("/")
					.filter(Boolean)
					.map((segment) => encodeURIComponent(segment))
					.join("/")}`;

	if (!PREFIX_DEFAULT_LOCALE) {
		if (locale === DEFAULT_LOCALE) {
			return basePath;
		}

		if (basePath === "/") {
			return `/${locale}`;
		}

		return `/${locale}${basePath}`;
	}

	if (basePath === "/") {
		return `/${locale}`;
	}

	return `/${locale}${basePath}`;
}
