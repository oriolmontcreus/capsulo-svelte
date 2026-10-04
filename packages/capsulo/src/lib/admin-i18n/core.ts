/**
 * Admin UI translations: the language the CMS itself speaks to editors. Not to be confused with
 * `i18n.locales` in `capsulo.config.ts`, which are the languages of the site's content.
 *
 * Plain TypeScript with no Svelte or browser imports: the content validator and the Worker API
 * use it too. Components import from `$lib/admin-i18n`, which makes `t()` reactive.
 */
import capsuloConfig from "virtual:capsulo/config";
import type { CapsuloAdminLocale, CapsuloConfig } from "../config/define-config";
import { en, type Message, type MessageKey, type Messages } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";

export type { MessageKey } from "./messages/en";
export type UiLocale = CapsuloAdminLocale;

export const UI_LOCALES = ["en", "es", "fr"] as const satisfies readonly UiLocale[];
export const FALLBACK_UI_LOCALE: UiLocale = "en";

/** Remembers the editor's choice in the browser, so the login page and first paint use it. */
export const UI_LOCALE_COOKIE = "capsulo_ui_locale";

const dictionaries: Record<UiLocale, Messages> = { en, es, fr };

export function isUiLocale(value: unknown): value is UiLocale {
	return typeof value === "string" && (UI_LOCALES as readonly string[]).includes(value);
}

function configuredUiLocale(): UiLocale | undefined {
	const locale = (capsuloConfig as CapsuloConfig).admin?.locale;
	if (locale === undefined) return undefined;
	if (!isUiLocale(locale)) {
		throw new Error(
			`capsulo.config.ts -> admin.locale must be one of ${UI_LOCALES.map((code) => `"${code}"`).join(", ")}. Received "${String(locale)}".`
		);
	}
	return locale;
}

/** `admin.locale` from `capsulo.config.ts`, if the project sets one. */
export const CONFIGURED_UI_LOCALE = configuredUiLocale();

/** The language admin pages are prerendered in; the editor's own language replaces it on load. */
export const BUILD_UI_LOCALE: UiLocale = CONFIGURED_UI_LOCALE ?? FALLBACK_UI_LOCALE;

/** The first browser language the admin supports ("es-MX" counts as "es"). */
function matchBrowserLocale(languages: readonly string[]): UiLocale | undefined {
	for (const language of languages) {
		const primary = language.trim().toLowerCase().split(/[-_]/)[0];
		if (isUiLocale(primary)) return primary;
	}
	return undefined;
}

/**
 * Which language the admin speaks, first match wins: the editor's own choice, the project's
 * `admin.locale`, the browser's language, English.
 */
export function resolveUiLocale(input: {
	stored?: string | null;
	browserLanguages?: readonly string[];
}): UiLocale {
	if (isUiLocale(input.stored)) return input.stored;
	return CONFIGURED_UI_LOCALE ?? matchBrowserLocale(input.browserLanguages ?? []) ?? FALLBACK_UI_LOCALE;
}

/** Outside the browser (build, Worker API) the admin speaks the project's language. */
let readLocale: () => UiLocale = () => BUILD_UI_LOCALE;

/** Lets the Svelte runtime route reads through its reactive state. */
export function setUiLocaleReader(reader: () => UiLocale): void {
	readLocale = reader;
}

/**
 * Runs synchronous code with `t()` speaking `locale` (the Worker uses it to validate content in
 * the requesting editor's language). Must stay synchronous: the swap is global to the isolate.
 */
export function withUiLocale<T>(locale: UiLocale, run: () => T): T {
	const previous = readLocale;
	readLocale = () => locale;
	try {
		return run();
	} finally {
		readLocale = previous;
	}
}

export function getUiLocale(): UiLocale {
	return readLocale();
}

export type MessageParams = Record<string, string | number>;

const pluralRulesCache = new Map<UiLocale, Intl.PluralRules>();

function pluralRules(locale: UiLocale): Intl.PluralRules {
	let rules = pluralRulesCache.get(locale);
	if (!rules) {
		rules = new Intl.PluralRules(locale);
		pluralRulesCache.set(locale, rules);
	}
	return rules;
}

function pickForm(message: Message, locale: UiLocale, params: MessageParams | undefined): string {
	if (typeof message === "string") return message;
	const count = Number(params?.count ?? 0);
	if (count === 0 && message.zero !== undefined) return message.zero;
	const category = pluralRules(locale).select(count) as keyof typeof message;
	return message[category] ?? message.other;
}

function interpolate(text: string, params: MessageParams | undefined): string {
	if (!params) return text;
	return text.replace(/\{(\w+)\}/g, (token, name: string) =>
		Object.hasOwn(params, name) ? String(params[name]) : token
	);
}

/** The message in `locale`. `{name}` placeholders take `params`; plural messages pick a form by `params.count`. */
export function translate(locale: UiLocale, key: MessageKey, params?: MessageParams): string {
	const message = dictionaries[locale]?.[key] ?? en[key];
	if (message === undefined) return key;
	return interpolate(pickForm(message, locale, params), params);
}

/** The message in the admin's current language. */
export function t(key: MessageKey, params?: MessageParams): string {
	const locale = readLocale();
	return translate(locale, key, params);
}

/** Native name of each admin language, for the language picker. */
export const UI_LOCALE_NAMES: Record<UiLocale, string> = {
	en: "English",
	es: "Español",
	fr: "Français"
};
