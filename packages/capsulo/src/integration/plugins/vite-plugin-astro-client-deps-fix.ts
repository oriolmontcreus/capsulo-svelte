import type { Plugin } from "vite";

/**
 * Workaround for Astro 6.x client environment optimizeDeps regression.
 * @see https://github.com/withastro/astro/issues/16630
 *
 * Astro's client env excludes `.astro` from dep scanning and late-discovers
 * transition virtual modules via ClientRouter, triggering a re-optimization
 * that invalidates already-loaded chunks (504 Outdated Optimize Dep + hydration failures).
 */
const LATE_CLIENT_DEPS = [
	"astro/virtual-modules/transitions-router.js",
	"astro/virtual-modules/transitions-types.js",
	"astro/virtual-modules/transitions-events.js",
	"astro/virtual-modules/transitions-swap-functions.js",
] as const;

/**
 * When Capsulo's source sits outside `src/` (this repo's playground), it's scanned too, so the
 * admin's client dependencies are optimized up front. Installed in node_modules it's left out:
 * the scanner can't follow its source there (see vite-plugin-package-source).
 */
export function astroClientDepsFixPlugin(frameworkSrcDir: string): Plugin {
	const normalized = frameworkSrcDir.replaceAll("\\", "/");
	const frameworkEntries = normalized.includes("/node_modules/") ? [] : [`${normalized}/**/*.{svelte,astro}`];
	return {
		name: "astro-client-deps-fix",
		configEnvironment(environmentName, options) {
			if (environmentName !== "client") {
				return;
			}

			return {
				optimizeDeps: {
					entries: ["src/**/*.{jsx,tsx,vue,svelte,html,astro}", ...frameworkEntries],
					exclude: [...(options.optimizeDeps?.exclude ?? []), ...LATE_CLIENT_DEPS],
				},
			};
		},
	};
}
