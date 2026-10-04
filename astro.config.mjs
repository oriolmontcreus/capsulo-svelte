// @ts-check
import { defineConfig } from 'astro/config';

// Capsulo's dev playground. Sites import `capsulo/astro` (the bundled dist/astro.js); here the
// integration is loaded from source, so changes to it apply without rebuilding the package.
import capsulo, { capsuloAdapter } from './packages/capsulo/src/integration/index.ts';
import capsuloConfig from './capsulo.config.ts';

// https://astro.build/config
export default defineConfig({
  adapter: capsuloAdapter(),
  integrations: [capsulo(capsuloConfig)],
});
