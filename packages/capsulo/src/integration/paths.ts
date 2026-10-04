/** Site folders Capsulo reads, relative to the project root. */
export const PAGES_DIR = "src/pages";
export const CAPSULES_DIR = "src/components/capsules";
export const GLOBALS_SCHEMA_FILE = "src/config/globals/globals.schema.ts";

/**
 * The framework source folder (`node_modules/capsulo/src/`, or `src/capsulo/` once ejected).
 * Installed from npm the integration runs bundled as `dist/astro.js`, next to `src/`; from
 * source (this repo, or ejected) this file is `src/integration/paths.ts`.
 */
export const SRC_DIR = new URL(/\/dist\/[^/]+\.js$/.test(import.meta.url) ? "../src/" : "../", import.meta.url);
