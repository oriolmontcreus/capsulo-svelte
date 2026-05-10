export interface CapsuloI18nConfig {
	locales: string[];
	defaultLocale: string;
	fallbackLocale?: string;
}

export interface CapsuloConfig {
	i18n: CapsuloI18nConfig;
}

export function defineCapsuloConfig<TConfig extends CapsuloConfig>(config: TConfig): TConfig {
	return config;
}
