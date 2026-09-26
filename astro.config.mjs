// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, sessionDrivers } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

import svelte from '@astrojs/svelte';

import tailwindcss from '@tailwindcss/vite';
import { astroClientDepsFixPlugin } from './src/lib/vite-plugin-astro-client-deps-fix.ts';
import { capsuleManifestPlugin } from './src/lib/vite-plugin-capsule-manifest.ts';
import { capsuloPublishedPlugin } from './src/lib/vite-plugin-capsulo-published.ts';
import { capsuloAiDevPlugin } from './src/lib/vite-plugin-capsulo-ai-dev.ts';
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
  // Pages stay prerendered (static, free to serve). Only `/api/capsulo/*` runs on the Worker.
  adapter: cloudflare({
    prerenderEnvironment: 'node',
    // Workers AI (the admin's AI agent) has no local simulator. With remote bindings on,
    // `astro dev` would not start without a Cloudflare login; the AI dev proxy below calls
    // Workers AI only when the sidebar is used. D1 and KV are local either way.
    remoteBindings: false,
    imageService: { build: 'compile', runtime: 'passthrough' },
  }),

  // The CMS keeps its own sessions in D1; this stops the adapter from provisioning a KV namespace for Astro sessions.
  session: { driver: sessionDrivers.lruCache() },

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
      capsuloPublishedPlugin(),
      capsuloAiDevPlugin(),
      schemaTypesPlugin(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        $lib: path.resolve(__dirname, 'src/lib'),
      },
      dedupe: ['astro'],
    },
    server: {
      // Dev only. Vite serves pre-bundled deps (`/node_modules/.vite/deps/*?v=…`) as `immutable`,
      // but an entry like `svelte.js?v=…` keeps its URL while the shared chunks it imports get a
      // new `?v=` whenever deps are re-optimized (e.g. after switching branches). The browser then
      // mixes cached and fresh files, loads two Svelte runtimes and hydration crashes
      // (`node.remove is not a function`). `no-cache` makes it revalidate by ETag (cheap 304s).
      headers: { 'Cache-Control': 'no-cache' },
    },
  },
});