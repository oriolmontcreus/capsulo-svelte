import { render, type CollectionEntry } from 'astro:content';
import type { TypeNode } from '@/components/previews/type-table';
import { loadExample } from '@/previews/examples';
import { pageUrl } from './page-tree';

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
}

/** Inline HTML used in TypeTable descriptions, as Markdown. */
function htmlToMarkdown(html: string): string {
  return html.replace(/<code>(.*?)<\/code>/g, '`$1`').replace(/<[^>]+>/g, '');
}

function typeTableMarkdown(source: string): string[] {
  const literal = source.replace(/^\s*<TypeTable\s+type=\{/, '').replace(/\}\s*\/>\s*$/, '');
  // The docs' own MDX source, evaluated at build time.
  const rows = new Function(`return (${literal});`)() as Record<string, TypeNode>;
  const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return [
    '| Prop | Type | Default | Description |',
    '| --- | --- | --- | --- |',
    ...Object.entries(rows).map(
      ([name, row]) =>
        `| \`${name}\` | \`${cell(row.type)}\` | ${row.default ? `\`${cell(row.default)}\`` : ''} | ${cell(htmlToMarkdown(row.description ?? ''))} |`,
    ),
  ];
}

const HIGHLIGHT_MARK = /^\/\/ \[!code [^\]]*\]$/;

/**
 * The page's MDX as plain Markdown: no import/export lines, type tables as Markdown
 * tables, and each live preview as its title and example code.
 */
function mdxToMarkdown(body: string): string {
  const out: string[] = [];
  const lines = body.split('\n');
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) inCode = !inCode;
    if (inCode || trimmed.startsWith('```')) {
      // `// [!code word:…]` only drives the highlighting on the site.
      if (!HIGHLIGHT_MARK.test(trimmed)) out.push(line);
      continue;
    }
    if (/^(import|export) /.test(line) || /^<\/?Previews>$/.test(trimmed)) continue;
    if (trimmed.startsWith('<ComponentPreview')) {
      const title = attribute(trimmed, 'title') ?? '';
      const { code } = loadExample(attribute(trimmed, 'example') ?? '', title);
      out.push(`**${title}**`, '', '```ts', ...code.split('\n').filter((row) => !HIGHLIGHT_MARK.test(row)), '```');
      continue;
    }
    if (trimmed.startsWith('<TypeTable')) {
      const start = i;
      while (!lines[i]!.trim().endsWith('/>')) i++;
      out.push(...typeTableMarkdown(lines.slice(start, i + 1).join('\n')));
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** The page as Markdown, for "Copy Markdown" and llms.txt. */
export function pageMarkdown(entry: CollectionEntry<'docs'>): string {
  const body = mdxToMarkdown(entry.body ?? '');
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
    .replace(/\\?\|/g, ' ')
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

  for (const line of mdxToMarkdown(entry.body ?? '').split('\n')) {
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
    // Table header and separator rows carry no text.
    if (/^\|[\s|:-]+\|$/.test(line.trim()) || line.startsWith('| Prop |')) continue;
    // Blank lines end a paragraph; each list item and table row is its own result.
    if (line.trim() === '' || line.trim().startsWith('|') || /^\s*(?:[-+*]|\d+\.)\s+/.test(line)) flush();
    if (line.trim() !== '') paragraph.push(line);
  }
  flush();
  return result;
}
