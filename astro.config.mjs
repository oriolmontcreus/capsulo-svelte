// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

import tailwindcss from '@tailwindcss/vite';
import { capsuleManifestPlugin } from './src/lib/vite-plugin-capsule-manifest.ts';
import { schemaTypesPlugin } from './src/lib/vite-plugin-schema-types.ts';
import capsuloConfig from './capsulo.config.ts';
import { assertI18nConfig } from './src/lib/config/i18n-config.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
assertI18nConfig(capsuloConfig.i18n);

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],

  vite: {
    plugins: [capsuleManifestPlugin(), schemaTypesPlugin(), tailwindcss()],
    resolve: {
      alias: {
        $lib: path.resolve(__dirname, 'src/lib'),
      },
    },
    // Workaround para el bug de Astro 6.x donde el client environment
    // no incluye .astro en optimizeDeps.entries, causando re-optimizaciones
    // tardías que invalidan el hash del dev toolbar (504 Outdated Optimize Dep).
    // Seguir de cerca: https://github.com/withastro/astro/issues/16630
    optimizeDeps: {
      entries: ['src/**/*.{jsx,tsx,vue,svelte,html,astro}'],
    },
  },
});