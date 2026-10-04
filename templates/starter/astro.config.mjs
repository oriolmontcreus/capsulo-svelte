// @ts-check
import { defineConfig } from "astro/config";
import capsulo, { capsuloAdapter } from "capsulo/astro";
import capsuloConfig from "./capsulo.config.ts";

// https://astro.build/config
export default defineConfig({
	adapter: capsuloAdapter(),
	integrations: [capsulo(capsuloConfig)]
});
