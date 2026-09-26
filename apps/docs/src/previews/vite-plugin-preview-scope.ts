import postcss from 'postcss';
import type { Plugin } from 'vite';

const PREVIEW_SCOPE = '.capsulo-preview';

/**
 * Nests every rule of the previews' stylesheet (preview.css) under `.capsulo-preview`,
 * once Tailwind has compiled it. The extra class outranks the docs' rules for the same
 * utilities, and the app's `:root` / `.dark` theme variables apply only inside previews.
 * Page-level rules (`html`, `body`) are dropped: the docs already set those.
 */
export function previewScopePlugin(): Plugin {
  return {
    name: 'capsulo-docs:preview-scope',
    // After @tailwindcss/vite (also `pre`, listed first), before Vite's own CSS handling.
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0].replaceAll('\\', '/').endsWith('/previews/preview.css')) return null;

      const root = postcss.parse(code);
      root.walkRules((rule) => {
        const parent = rule.parent;
        if (parent?.type === 'atrule' && (parent as postcss.AtRule).name.endsWith('keyframes')) return;

        const selectors = rule.selectors.map((selector) => scopeSelector(selector.trim())).filter((s): s is string => s !== null);
        if (selectors.length === 0) rule.remove();
        else rule.selectors = [...new Set(selectors)];
      });
      return { code: root.toString(), map: null };
    },
  };
}

function scopeSelector(selector: string): string | null {
  if (selector === ':root') return PREVIEW_SCOPE;
  if (selector === '.dark') return `.dark ${PREVIEW_SCOPE}`;
  if (selector === 'html' || selector === 'body' || selector === ':host') return null;
  return `${PREVIEW_SCOPE} ${selector}`;
}
