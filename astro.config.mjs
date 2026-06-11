// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

import tailwindcss from '@tailwindcss/vite';
import { astroClientDepsFixPlugin } from './src/lib/vite-plugin-astro-client-deps-fix.ts';
import { capsuleManifestPlugin } from './src/lib/vite-plugin-capsule-manifest.ts';
import { schemaTypesPlugin } from './src/lib/vite-plugin-schema-types.ts';
import capsuloConfig from './capsulo.config.ts';
import { assertI18nConfig, getI18nConfig } from './src/lib/config/i18n-config.ts';
import { autoI18nRoutes, buildUnprefixedLocaleRedirects } from './src/lib/astro-i18n-auto-routes.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
assertI18nConfig(capsuloConfig.i18n);
const i18nConfig = getI18nConfig(capsuloConfig);
const pagesDir = path.join(__dirname, 'src', 'pages');

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: i18nConfig.defaultLocale,
    locales: i18nConfig.locales,
    // Manual routing: public pages use injected /{locale}/* routes; admin stays at /admin/*.
    routing: 'manual',
  },

  redirects: {
    ...(i18nConfig.prefixDefaultLocale
      ? buildUnprefixedLocaleRedirects(i18nConfig.defaultLocale, pagesDir)
      : {}),
    '/login': '/admin/login',
    '/es/login': '/admin/login',
    '/en/login': '/admin/login',
  },

  integrations: [svelte(), autoI18nRoutes()],

  vite: {
    plugins: [
      astroClientDepsFixPlugin(),
      capsuleManifestPlugin(),
      schemaTypesPlugin(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        $lib: path.resolve(__dirname, 'src/lib'),
      },
      dedupe: ['astro'],
    },
  },
});