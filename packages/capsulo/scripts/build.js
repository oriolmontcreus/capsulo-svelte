// @ts-check
// Bundles the integration to dist/astro.js. Astro loads astro.config (and so `capsulo/astro`)
// with plain Node, which can't run TypeScript from node_modules. Everything else ships as source.
import { build } from "esbuild";

await build({
	entryPoints: { astro: "src/integration/index.ts" },
	outdir: "dist",
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	// Dependencies stay imports; only Capsulo's own files are bundled.
	packages: "external",
	logLevel: "info"
});
