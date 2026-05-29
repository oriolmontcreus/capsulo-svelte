export interface CapsuloI18nConfig {
	locales: string[];
	defaultLocale: string;
	fallbackLocale?: string;
	prefixDefaultLocale?: boolean;
}

export interface CapsuloConfig {
	i18n: CapsuloI18nConfig;
}

export function defineCapsuloConfig<TConfig extends CapsuloConfig>(config: TConfig): TConfig {
	return config;
}
