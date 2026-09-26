import type { APIRoute } from 'astro';
import { flattenTree, getPageTree } from '@/lib/page-tree';
import { pageMarkdown } from '@/lib/markdown';

// Every page's Markdown in sidebar order, for pasting the whole docs into an LLM.
export const GET: APIRoute = async () => {
  const pages = flattenTree(await getPageTree());
  return new Response(pages.map((page) => pageMarkdown(page.entry)).join('\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
