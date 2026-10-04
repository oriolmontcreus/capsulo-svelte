import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

import type { CapsuloConfig } from "../../lib/config/define-config";
import { CAPSULES_DIR, GLOBALS_SCHEMA_FILE } from "../paths";

const PREFIX = "virtual:capsulo/";
const MODULES = ["config", "globals-schema", "capsules", "capsule-schemas"] as const;
type ModuleName = (typeof MODULES)[number];

function normalizeSlashes(value: string): string {
	return value.replaceAll("\\", "/");
}

/**
 * The framework never imports the site's files by path, so it works the same from
 * node_modules and from an ejected `src/capsulo/`. These modules hand it what it needs:
 * the capsulo.config.ts values, the globals schema and the site's capsules.
 */
export function capsuloVirtualModulesPlugin(config: CapsuloConfig, emptyGlobalsSchema: string): Plugin {
	let root = process.cwd();

	function load(name: ModuleName): string {
		switch (name) {
			case "config":
				return `export default ${JSON.stringify(config)};`;
			case "globals-schema": {
				const file = path.join(root, GLOBALS_SCHEMA_FILE);
				return `export { globalsSchema } from ${JSON.stringify(normalizeSlashes(fs.existsSync(file) ? file : emptyGlobalsSchema))};`;
			}
			// Root-relative globs: Vite resolves a leading `/` against the project root.
			case "capsules":
				return `export default import.meta.glob("/${CAPSULES_DIR}/**/capsule.definition.ts", { eager: true });`;
			case "capsule-schemas":
				return `export default import.meta.glob("/${CAPSULES_DIR}/**/*.schema.ts", { eager: true });`;
		}
	}

	return {
		name: "capsulo-virtual-modules",
		enforce: "pre",
		configResolved(resolved) {
			root = resolved.root;
		},
		resolveId(id) {
			if (id.startsWith(PREFIX) && (MODULES as readonly string[]).includes(id.slice(PREFIX.length))) {
				return `\0${id}`;
			}
		},
		load(id) {
			if (id.startsWith(`\0${PREFIX}`)) {
				const name = id.slice(PREFIX.length + 1);
				if ((MODULES as readonly string[]).includes(name)) return load(name as ModuleName);
			}
		}
	};
}
