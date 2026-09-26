import { transformerNotationWordHighlight } from '@shikijs/transformers';
import { codeToHtml } from 'shiki';

/**
 * Highlights code outside Markdown (the preview code dialogs) with the same settings
 * as astro.config.mjs, and returns what CodeBlock.astro needs to draw the same frame.
 */
export async function highlight(code: string, lang: string): Promise<{ style: string; html: string }> {
  const out = await codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
    transformers: [transformerNotationWordHighlight()],
  });
  const match = out.match(/^<pre[^>]*style="([^"]*)"[^>]*>([\s\S]*)<\/pre>$/);
  if (!match) throw new Error('Unexpected Shiki output.');
  return { style: match[1]!, html: match[2]! };
}
