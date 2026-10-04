// @ts-check
// Plain JavaScript (types in config.d.ts): capsulo.config.ts imports it while astro.config
// loads, and Node can't run TypeScript from node_modules.

/**
 * @template {import("./config").CapsuloConfig} TConfig
 * @param {TConfig} config
 * @returns {TConfig}
 */
export function defineCapsuloConfig(config) {
	return config;
}
