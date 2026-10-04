// Node loader for the *.test-manual.ts scripts: outside Vite there is no integration to generate
// Capsulo's `virtual:*` modules, so they resolve to stand-ins (the playground's i18n setup).
//   pnpm dlx tsx --import ./packages/capsulo/test/virtual-modules.mjs <file>.test-manual.ts
import { register } from "node:module";

const config = { i18n: { locales: ["es", "en"], defaultLocale: "es", prefixDefaultLocale: true } };
const emptyGlobals = new URL("../src/lib/globals/empty-globals.schema.ts", import.meta.url).href;

const modules = {
	"virtual:capsulo/config": `export default ${JSON.stringify(config)};`,
	"virtual:capsulo/capsules": "export default {};",
	"virtual:capsulo/capsule-schemas": "export default {};",
	"virtual:capsule-manifest": "export default {};",
};

const hooks = `
const modules = ${JSON.stringify(modules)};
export async function resolve(specifier, context, next) {
	if (specifier === "virtual:capsulo/globals-schema") return { url: ${JSON.stringify(emptyGlobals)}, shortCircuit: true };
	if (specifier in modules) return { url: "data:text/javascript," + encodeURIComponent(modules[specifier]), shortCircuit: true };
	return next(specifier, context);
}`;

register(`data:text/javascript,${encodeURIComponent(hooks)}`);
