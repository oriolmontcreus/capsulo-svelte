import { render, type CollectionEntry } from 'astro:content';
import { pageUrl } from './page-tree';

/** The page's MDX source without import/export lines, for "Copy Markdown" and llms.txt. */
export function pageMarkdown(entry: CollectionEntry<'docs'>): string {
  const body = (entry.body ?? '')
    .split('\n')
    .filter((line) => !/^(import|export) /.test(line))
    .join('\n')
    .trim();
  return `# ${entry.data.title}\n\n${entry.data.description ? `${entry.data.description}\n\n` : ''}${body}\n`;
}

export function markdownUrl(entry: CollectionEntry<'docs'>): string {
  return `/llms.mdx/docs/${entry.id}.md`;
}

export type SearchEntry = {
  url: string;
  title: string;
  description?: string;
  breadcrumbs: string[];
  headings: { id: string; content: string }[];
  /** Paragraphs, each tagged with the heading it sits under (or none). */
  contents: { heading?: string; content: string }[];
};

function plainText(markdown: string): string {
  // Inline code first, so `<name>` inside it isn't mistaken for a tag.
  const code: string[] = [];
  return markdown
    .replace(/`([^`]*)`/g, (_, text: string) => `\u0000${code.push(text) - 1}\u0000`)
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/^\s*(?:[-+*]|\d+\.)\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\u0000(\d+)\u0000/g, (_, i: string) => code[Number(i)])
    .replace(/\s+/g, ' ')
    .trim();
}

/** Structured text of a page for the search dialog: title, headings and paragraphs. */
export async function searchEntry(entry: CollectionEntry<'docs'>, breadcrumbs: string[]): Promise<SearchEntry> {
  const { headings } = await render(entry);
  const queue = headings.filter((heading) => heading.depth >= 2);
  const result: SearchEntry = {
    url: pageUrl(entry.id),
    title: entry.data.title,
    description: entry.data.description,
    breadcrumbs,
    headings: [],
    contents: [],
  };

  let current: string | undefined;
  let inCode = false;
  let paragraph: string[] = [];
  const flush = () => {
    const text = plainText(paragraph.join(' '));
    if (text.length > 0) result.contents.push({ heading: current, content: text });
    paragraph = [];
  };

  for (const line of (entry.body ?? '').split('\n')) {
    if (line.trimStart().startsWith('```')) {
      flush();
      inCode = !inCode;
      continue;
    }
    if (inCode || /^(import|export) /.test(line)) continue;
    const heading = /^(#{2,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const match = queue.shift();
      if (match) {
        current = match.slug;
        result.headings.push({ id: match.slug, content: match.text });
      }
      continue;
    }
    // Blank lines end a paragraph; each list item is its own result.
    if (line.trim() === '' || /^\s*(?:[-+*]|\d+\.)\s+/.test(line)) flush();
    if (line.trim() !== '') paragraph.push(line);
  }
  flush();
  return result;
}
