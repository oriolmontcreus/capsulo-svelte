export interface CapsuloI18nConfig {
	locales: string[];
	defaultLocale: string;
	fallbackLocale?: string;
	prefixDefaultLocale?: boolean;
}

export interface CapsuloAiConfig {
	/** Set to false to hide the AI agent sidebar. Default: true. */
	enabled?: boolean;
	/**
	 * Workers AI model id. It must support function calling. Default:
	 * "@cf/google/gemma-4-26b-a4b-it" (about 30 messages a day on the free plan).
	 */
	model?: string;
}

/** Languages the admin UI itself is translated into (independent of the site's `i18n.locales`). */
export type CapsuloAdminLocale = "en" | "es" | "fr";

export interface CapsuloAdminConfig {
	/**
	 * Language of the admin UI for editors who haven't picked one themselves (each editor can
	 * change it from the admin). When unset, the editor's browser language is used if the admin
	 * supports it, else English.
	 */
	locale?: CapsuloAdminLocale;
}

export interface CapsuloConfig {
	i18n: CapsuloI18nConfig;
	/** The admin UI itself (not the site's content). */
	admin?: CapsuloAdminConfig;
	/** AI agent sidebar in the admin. Runs on Workers AI; no API key needed. */
	ai?: CapsuloAiConfig;
}
