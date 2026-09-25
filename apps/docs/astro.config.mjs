// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { transformerNotationWordHighlight } from '@shikijs/transformers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // Live previews import the real admin components from the main app.
        $lib: path.resolve(__dirname, '../../src/lib'),
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
});
