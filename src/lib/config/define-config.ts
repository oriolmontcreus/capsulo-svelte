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

export interface CapsuloConfig {
	i18n: CapsuloI18nConfig;
	/** AI agent sidebar in the admin. Runs on Workers AI; no API key needed. */
	ai?: CapsuloAiConfig;
}

export function defineCapsuloConfig<TConfig extends CapsuloConfig>(config: TConfig): TConfig {
	return config;
}
