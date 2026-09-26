import type { APIRoute } from 'astro';
import { flattenTree, folderPath, getPageTree } from '@/lib/page-tree';
import { searchEntry } from '@/lib/markdown';

// Static search index, loaded by the search dialog the first time it opens.
export const GET: APIRoute = async () => {
  const tree = await getPageTree();
  const entries = await Promise.all(
    flattenTree(tree).map((page) => searchEntry(page.entry, folderPath(tree, page.url) ?? [])),
  );
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json' } });
};
