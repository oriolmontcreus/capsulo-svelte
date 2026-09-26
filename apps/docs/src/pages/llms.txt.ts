import type { APIRoute } from 'astro';
import { flattenTree, getPageTree } from '@/lib/page-tree';
import { markdownUrl } from '@/lib/markdown';
import { site } from '@/lib/site';

// https://llmstxt.org: an index of the docs with links to each page's Markdown.
export const GET: APIRoute = async ({ site: origin }) => {
  const pages = flattenTree(await getPageTree());
  const link = (path: string) => (origin ? new URL(path, origin).href : path);
  const lines = [
    `# ${site.title}`,
    '',
    `> ${site.description}`,
    '',
    '## Docs',
    '',
    ...pages.map(
      (page) => `- [${page.name}](${link(markdownUrl(page.entry))})${page.description ? `: ${page.description}` : ''}`,
    ),
    '',
    `Full text: ${link('/llms-full.txt')}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
