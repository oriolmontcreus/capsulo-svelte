import capsuloConfig from "virtual:capsulo/config";
import { getI18nConfig } from "./i18n-resolve";

export { getI18nConfig } from "./i18n-resolve";

const resolvedConfig = getI18nConfig(capsuloConfig);

export const LOCALES = resolvedConfig.locales;
export const DEFAULT_LOCALE = resolvedConfig.defaultLocale;
export const PREFIX_DEFAULT_LOCALE = resolvedConfig.prefixDefaultLocale;

export function isValidLocale(locale: string): boolean {
	return LOCALES.includes(locale);
}
