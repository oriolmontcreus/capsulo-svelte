/**
 * The admin's language as reactive state: `t()` called in a template or `$derived` re-runs when
 * the editor switches language. Resolved synchronously on load (from the cookie), so modules and
 * components see the right language from their first render.
 */
import {
	BUILD_UI_LOCALE,
	UI_LOCALE_COOKIE,
	resolveUiLocale,
	setUiLocaleReader,
	type UiLocale
} from "./core";

export {
	UI_LOCALES,
	UI_LOCALE_NAMES,
	getUiLocale,
	isUiLocale,
	t,
	type MessageKey,
	type UiLocale
} from "./core";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function readCookie(name: string): string | null {
	const prefix = `${name}=`;
	const entry = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
	return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function initialLocale(): UiLocale {
	// The build renders the admin in the project's language; hydration then swaps in the editor's.
	if (typeof document === "undefined") return BUILD_UI_LOCALE;
	return resolveUiLocale({ stored: readCookie(UI_LOCALE_COOKIE), browserLanguages: navigator.languages });
}

const state = $state<{ locale: UiLocale }>({ locale: initialLocale() });

setUiLocaleReader(() => state.locale);

function syncDocumentLang(): void {
	if (location.pathname.startsWith("/admin")) document.documentElement.lang = state.locale;
}

if (typeof document !== "undefined") {
	syncDocumentLang();
	// The client router copies <html lang> from each page it swaps in (the site's language).
	document.addEventListener("astro:after-swap", syncDocumentLang);
}

/**
 * Switches the admin's language in this browser. See `changeUiLocale` to also save it on the
 * account. `remember: false` changes it for this page only (no cookie).
 */
export function setUiLocale(locale: UiLocale, { remember = true }: { remember?: boolean } = {}): void {
	state.locale = locale;
	if (typeof document === "undefined") return;
	syncDocumentLang();
	if (!remember) return;
	const secure = location.protocol === "https:" ? "; Secure" : "";
	document.cookie = `${UI_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

// Date formatters in the admin's language, cached per locale and options.
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(date: Date | number, options: Intl.DateTimeFormatOptions = {}): string {
	const key = `${state.locale}|${JSON.stringify(options)}`;
	let formatter = dateFormatters.get(key);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(state.locale, options);
		dateFormatters.set(key, formatter);
	}
	return formatter.format(date);
}
