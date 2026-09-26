import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Sidebar tree built the way Fumadocs builds it: one page per MDX file, one
 * folder per directory. An optional `meta.json` in a directory sets the folder
 * title and the order (`{ "title": "Fields", "pages": ["text", "select"] }`);
 * without it, `index` comes first, then pages and then folders, alphabetically.
 */

export type DocPage = {
  type: 'page';
  name: string;
  description?: string;
  url: string;
  entry: CollectionEntry<'docs'>;
};

export type DocFolder = {
  type: 'folder';
  name: string;
  children: DocNode[];
};

export type DocNode = DocPage | DocFolder;

type Meta = { title?: string; pages?: string[] };

const metaFiles = import.meta.glob<Meta>('../content/docs/**/meta.json', {
  eager: true,
  import: 'default',
});

function metaFor(dir: string): Meta {
  const key = `../content/docs/${dir ? `${dir}/` : ''}meta.json`;
  return metaFiles[key] ?? {};
}

export function pageUrl(id: string): string {
  const slug = id === 'index' ? '' : id.replace(/\/index$/, '');
  return slug ? `/docs/${slug}/` : '/docs/';
}

function titleCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
}

function buildFolder(dir: string, entries: CollectionEntry<'docs'>[]): DocNode[] {
  const prefix = dir ? `${dir}/` : '';
  const pages = new Map<string, DocNode>();
  const subdirs = new Set<string>();

  for (const entry of entries) {
    if (!entry.id.startsWith(prefix)) continue;
    const rest = entry.id.slice(prefix.length);
    const [head, ...tail] = rest.split('/');
    if (tail.length > 0) {
      subdirs.add(head);
      continue;
    }
    pages.set(head, {
      type: 'page',
      name: entry.data.title,
      description: entry.data.description,
      url: pageUrl(entry.id),
      entry,
    });
  }

  for (const sub of subdirs) {
    const path = `${prefix}${sub}`;
    pages.set(sub, {
      type: 'folder',
      name: metaFor(path).title ?? titleCase(sub),
      children: buildFolder(path, entries),
    });
  }

  const order = metaFor(dir).pages;
  const keys = [...pages.keys()].sort((a, b) => {
    if (order) {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    }
    if (a === 'index') return -1;
    if (b === 'index') return 1;
    // Fumadocs lists pages before folders.
    const folderA = pages.get(a)!.type === 'folder';
    const folderB = pages.get(b)!.type === 'folder';
    if (folderA !== folderB) return folderA ? 1 : -1;
    return a.localeCompare(b);
  });
  return keys.map((key) => pages.get(key)!);
}

export async function getPageTree(): Promise<DocNode[]> {
  const entries = await getCollection('docs');
  return buildFolder('', entries);
}

/** Pages in sidebar order, for the previous/next links. */
export function flattenTree(nodes: DocNode[]): DocPage[] {
  return nodes.flatMap((node) => (node.type === 'page' ? [node] : flattenTree(node.children)));
}

/** Folder names leading to a page, for the breadcrumb above the title. */
export function folderPath(nodes: DocNode[], url: string, trail: string[] = []): string[] | undefined {
  for (const node of nodes) {
    if (node.type === 'page' && node.url === url) return trail;
    if (node.type === 'folder') {
      const found = folderPath(node.children, url, [...trail, node.name]);
      if (found) return found;
    }
  }
  return undefined;
}

export function containsUrl(node: DocNode, url: string): boolean {
  return node.type === 'page' ? node.url === url : node.children.some((child) => containsUrl(child, url));
}
