// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { transformerNotationWordHighlight } from '@shikijs/transformers';

import { astroClientDepsFixPlugin } from '../../src/lib/vite-plugin-astro-client-deps-fix.ts';
import { previewMocksPlugin } from './src/previews/vite-plugin-preview-mocks.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The Capsulo app (repo root), whose form builder the live previews render.
const appRoot = path.resolve(__dirname, '../..');

// https://astro.build/config
export default defineConfig({
  // Fully static: the docs are plain HTML on Cloudflare, nothing runs on a Worker.
  output: 'static',
  trailingSlash: 'always',

  redirects: {
    '/': '/docs/',
  },

  integrations: [svelte(), mdx()],

  markdown: {
    // Fumadocs kept quotes as typed; Astro would curl them.
    processor: satteri({ features: { smartPunctuation: false } }),
    shikiConfig: {
      // Same themes as the old Fumadocs site. `defaultColor: false` emits only
      // --shiki-light / --shiki-dark variables, which styles/fumadocs/shiki.css reads.
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      // Supports `// [!code word:Name]` like the old site.
      transformers: [transformerNotationWordHighlight()],
    },
  },

  vite: {
    // The app's fix for Astro's late-discovered client router deps (504s and a reload in dev).
    plugins: [astroClientDepsFixPlugin(), tailwindcss(), previewMocksPlugin(appRoot)],
    resolve: {
      alias: {
        // Live previews import the real admin components from the main app.
        $lib: path.join(appRoot, 'src/lib'),
        $: path.join(appRoot, 'src'),
        '@': path.resolve(__dirname, 'src'),
      },
      // The app's components and the docs must share one Svelte runtime.
      dedupe: ['svelte'],
      // Svelte component libraries the app's form builder uses. The docs don't list them
      // as dependencies, so the Svelte integration doesn't know to compile them for SSR.
      noExternal: ['@lucide/svelte', 'bits-ui', 'svelte-toolbelt', 'runed'],
    },
  },
});
