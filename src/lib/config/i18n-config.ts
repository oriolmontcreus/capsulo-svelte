import capsuloConfig from "../../../capsulo.config";
import type { CapsuloConfig, CapsuloI18nConfig } from "./define-config";

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export interface ResolvedI18nConfig {
	locales: string[];
	defaultLocale: string;
	fallbackLocale?: string;
	prefixDefaultLocale: boolean;
}

function formatPath(path: string): string {
	return `capsulo.config.ts -> ${path}`;
}

function assertLocaleCode(locale: string, path: string): void {
	if (!LOCALE_CODE_PATTERN.test(locale)) {
		throw new Error(
			`${formatPath(path)} must use locale codes like "es" or "en-US". Received "${locale}".`
		);
	}
}

export function assertI18nConfig(i18n: CapsuloI18nConfig): asserts i18n is CapsuloI18nConfig {
	if (!Array.isArray(i18n.locales) || i18n.locales.length === 0) {
		throw new Error(`${formatPath("i18n.locales")} must contain at least one locale.`);
	}

	const locales = i18n.locales.map((locale) => locale.trim());
	if (locales.some((locale) => locale.length === 0)) {
		throw new Error(`${formatPath("i18n.locales")} cannot contain empty locale values.`);
	}

	const uniqueLocales = new Set(locales);
	if (uniqueLocales.size !== locales.length) {
		throw new Error(`${formatPath("i18n.locales")} contains duplicated locales.`);
	}

	for (const locale of locales) {
		assertLocaleCode(locale, `i18n.locales (${locale})`);
	}

	if (typeof i18n.defaultLocale !== "string" || i18n.defaultLocale.trim().length === 0) {
		throw new Error(`${formatPath("i18n.defaultLocale")} is required.`);
	}

	const defaultLocale = i18n.defaultLocale.trim();
	assertLocaleCode(defaultLocale, "i18n.defaultLocale");

	if (!uniqueLocales.has(defaultLocale)) {
		throw new Error(
			`${formatPath("i18n.defaultLocale")} must exist inside i18n.locales. Received "${defaultLocale}".`
		);
	}

	if (typeof i18n.fallbackLocale === "string" && i18n.fallbackLocale.trim().length > 0) {
		const fallbackLocale = i18n.fallbackLocale.trim();
		assertLocaleCode(fallbackLocale, "i18n.fallbackLocale");

		if (!uniqueLocales.has(fallbackLocale)) {
			throw new Error(
				`${formatPath("i18n.fallbackLocale")} must exist inside i18n.locales. Received "${fallbackLocale}".`
			);
		}
	}
}

export function getI18nConfig(config: CapsuloConfig = capsuloConfig): ResolvedI18nConfig {
	assertI18nConfig(config.i18n);

	const locales = config.i18n.locales.map((locale) => locale.trim());
	const defaultLocale = config.i18n.defaultLocale.trim();
	const fallbackLocale = config.i18n.fallbackLocale?.trim();
	const prefixDefaultLocale =
		config.i18n.prefixDefaultLocale ?? locales.length > 1;

	return {
		locales,
		defaultLocale,
		fallbackLocale: fallbackLocale && fallbackLocale.length > 0 ? fallbackLocale : undefined,
		prefixDefaultLocale
	};
}

const resolvedConfig = getI18nConfig(capsuloConfig);

export const LOCALES = resolvedConfig.locales;
export const DEFAULT_LOCALE = resolvedConfig.defaultLocale;
export const FALLBACK_LOCALE = resolvedConfig.fallbackLocale;
export const PREFIX_DEFAULT_LOCALE = resolvedConfig.prefixDefaultLocale;

export function isValidLocale(locale: string): boolean {
	return LOCALES.includes(locale);
}
