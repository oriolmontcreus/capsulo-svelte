import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/** True for packages that ship Svelte source (a `svelte` export condition or field). */
function shipsSvelteSource(packageJsonPath: string): boolean {
	try {
		const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { svelte?: unknown; exports?: unknown };
		return Boolean(pkg.svelte) || JSON.stringify(pkg.exports ?? {}).includes('"svelte"');
	} catch {
		return false;
	}
}

/** Node-style lookup of `node_modules/<name>/package.json` from `fromDir` upwards. */
function findPackageJson(fromDir: string, name: string): string | undefined {
	let dir = fromDir;
	while (true) {
		const candidate = path.join(dir, "node_modules", name, "package.json");
		if (fs.existsSync(candidate)) return candidate;
		if (dir === path.dirname(dir)) return undefined;
		dir = path.dirname(dir);
	}
}

/**
 * Capsulo ships TypeScript and Svelte source (incl. `.svelte.ts` runes modules), so in every
 * environment Vite must compile it like the site's own files:
 * - The dependency pre-bundler can't: `capsulo` is kept out of `optimizeDeps`.
 * - When Capsulo is linked rather than installed (this repo's workspace, a `file:` dependency),
 *   Astro's dependency crawl marks its dependencies as SSR externals. Packages that ship Svelte
 *   source (bits-ui, mode-watcher…) can't be loaded by Node, so they're taken off that list.
 */
export function packageSourcePlugin(frameworkSrcDir: string): Plugin {
	const cache = new Map<string, boolean>();

	return {
		name: "capsulo-package-source",
		enforce: "post",
		configEnvironment(name, config) {
			const optimizeDeps = (config.optimizeDeps ??= {});
			optimizeDeps.include = optimizeDeps.include?.filter((id) => id !== "capsulo" && !id.startsWith("capsulo/"));
			optimizeDeps.exclude = [...(optimizeDeps.exclude ?? []), "capsulo"];

			const external = config.resolve?.external;
			if (name === "client" || !Array.isArray(external)) return;
			config.resolve!.external = external.filter((id) => {
				if (!cache.has(id)) {
					const packageJson = findPackageJson(frameworkSrcDir, id);
					cache.set(id, packageJson ? shipsSvelteSource(packageJson) : false);
				}
				return !cache.get(id);
			});
		}
	};
}
