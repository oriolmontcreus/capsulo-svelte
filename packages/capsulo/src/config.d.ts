export type {
	CapsuloAdminConfig,
	CapsuloAdminLocale,
	CapsuloAiConfig,
	CapsuloConfig,
	CapsuloI18nConfig
} from "./lib/config/define-config";

export declare function defineCapsuloConfig<TConfig extends import("./lib/config/define-config").CapsuloConfig>(
	config: TConfig
): TConfig;
