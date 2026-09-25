/**
 * Search dialog behaviour (Fumadocs' default dialog): ⌘K / Ctrl+K opens it, the
 * static index at /search.json is loaded on first open, arrow keys move, Enter opens.
 */
import { navigate } from 'astro:transitions/client';
import type { SearchEntry } from '@/lib/markdown';

type Result = {
  id: string;
  type: 'page' | 'heading' | 'text';
  url: string;
  content: string;
  breadcrumbs?: string[];
};

let index: SearchEntry[] | undefined;
let loading: Promise<SearchEntry[]> | undefined;
let results: Result[] | null = null;
let active: string | null = null;

const el = <T extends Element>(selector: string) => document.querySelector<T>(selector);

function loadIndex(): Promise<SearchEntry[]> {
  if (index) return Promise.resolve(index);
  loading ??= fetch('/search.json')
    .then((response) => response.json() as Promise<SearchEntry[]>)
    .then((data) => (index = data));
  return loading;
}

function terms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function matches(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.every((word) => lower.includes(word));
}

/** Cut long paragraphs so the first match is visible. */
function excerpt(text: string, words: string[]): string {
  const lower = text.toLowerCase();
  const first = Math.min(...words.map((word) => lower.indexOf(word)).filter((i) => i >= 0));
  if (!Number.isFinite(first) || first < 40) return text;
  const start = text.lastIndexOf(' ', first - 30);
  return `…${text.slice(start + 1)}`;
}

function search(query: string): Result[] | null {
  const words = terms(query);
  if (words.length === 0 || !index) return null;
  const out: Result[] = [];
  for (const page of index) {
    const pageHit = matches(`${page.title} ${page.description ?? ''}`, words);
    const headingHits = page.headings.filter((heading) => matches(heading.content, words));
    const textHits = page.contents.filter((text) => matches(text.content, words)).slice(0, 5);
    if (!pageHit && headingHits.length === 0 && textHits.length === 0) continue;
    out.push({ id: page.url, type: 'page', url: page.url, content: page.title, breadcrumbs: page.breadcrumbs });
    for (const heading of headingHits) {
      out.push({ id: `${page.url}#${heading.id}`, type: 'heading', url: `${page.url}#${heading.id}`, content: heading.content });
    }
    textHits.forEach((text, i) => {
      const url = text.heading ? `${page.url}#${text.heading}` : page.url;
      out.push({ id: `${page.url}-text-${i}-${text.heading ?? ''}`, type: 'text', url, content: excerpt(text.content, words) });
    });
  }
  return out.slice(0, 40);
}

function highlight(target: HTMLElement, text: string, words: string[]) {
  if (words.length === 0) {
    target.append(text);
    return;
  }
  const pattern = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  for (const part of text.split(pattern)) {
    if (!part) continue;
    if (words.includes(part.toLowerCase())) {
      const span = document.createElement('span');
      span.className = 'text-fd-primary underline';
      span.textContent = part;
      target.append(span);
    } else {
      target.append(part);
    }
  }
}

function icon(name: 'chevron' | 'hash'): Element {
  const template = el<HTMLTemplateElement>('template[data-search-icons]')!;
  return template.content.querySelector(`[data-icon="${name}"]`)!.cloneNode(true) as Element;
}

function render() {
  const list = el<HTMLElement>('[data-search-list]');
  const viewport = el<HTMLElement>('[data-search-viewport]');
  if (!list || !viewport) return;
  const words = terms(el<HTMLInputElement>('[data-search-input]')?.value ?? '');
  list.dataset.empty = String(results === null);
  viewport.classList.toggle('hidden', results === null);
  viewport.replaceChildren();
  if (results === null) return;

  if (results.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'py-12 text-center text-sm text-fd-muted-foreground';
    empty.textContent = 'No results found';
    viewport.append(empty);
  }

  for (const result of results) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = result.id;
    button.className = 'relative select-none px-2.5 py-2 text-start text-sm rounded-lg';
    button.addEventListener('pointermove', () => setActive(result.id));
    button.addEventListener('click', () => open(result));

    const crumbs = document.createElement('div');
    crumbs.className = 'inline-flex items-center text-fd-muted-foreground text-xs empty:hidden';
    result.breadcrumbs?.forEach((crumb, i) => {
      if (i > 0) crumbs.append(icon('chevron'));
      crumbs.append(crumb);
    });
    button.append(crumbs);

    if (result.type !== 'page') {
      const line = document.createElement('div');
      line.setAttribute('role', 'none');
      line.className = 'absolute start-3 inset-y-0 w-px bg-fd-border';
      button.append(line);
    }

    const text = document.createElement('p');
    text.className = [
      'min-w-0 truncate',
      result.type !== 'page' && 'ps-4',
      result.type === 'page' || result.type === 'heading' ? 'font-medium' : 'text-fd-popover-foreground/80',
    ]
      .filter(Boolean)
      .join(' ');
    if (result.type === 'heading') text.append(icon('hash'));
    highlight(text, result.content, words);
    button.append(text);
    viewport.append(button);
  }
  setActive(results[0]?.id ?? null);
}

function setActive(id: string | null) {
  active = id;
  for (const button of document.querySelectorAll<HTMLElement>('[data-search-viewport] > button')) {
    const selected = button.dataset.id === id;
    button.setAttribute('aria-selected', String(selected));
    button.classList.toggle('bg-fd-accent', selected);
    button.classList.toggle('text-fd-accent-foreground', selected);
    if (selected) button.scrollIntoView({ block: 'nearest' });
  }
}

function open(result: Result) {
  setOpen(false);
  void navigate(result.url);
}

function isOpen(): boolean {
  return el<HTMLElement>('[data-search-content]')?.dataset.state === 'open';
}

function setOpen(open: boolean) {
  const dialog = el<HTMLElement>('[data-search-dialog]');
  const overlay = el<HTMLElement>('[data-search-overlay]');
  const content = el<HTMLElement>('[data-search-content]');
  const input = el<HTMLInputElement>('[data-search-input]');
  if (!dialog || !overlay || !content || !input) return;
  const state = open ? 'open' : 'closed';
  overlay.dataset.state = state;
  content.dataset.state = state;
  if (open) {
    dialog.hidden = false;
    document.body.style.overflow = 'hidden';
    input.focus();
    const icon = el('[data-search-icon]');
    icon?.setAttribute('data-loading', '');
    void loadIndex().then(() => {
      icon?.removeAttribute('data-loading');
      results = search(input.value);
      render();
    });
  } else {
    document.body.style.overflow = '';
    content.addEventListener(
      'animationend',
      () => {
        if (content.dataset.state === 'closed') dialog.hidden = true;
      },
      { once: true },
    );
  }
}

document.addEventListener('click', (event) => {
  const target = event.target as Element;
  if (target.closest('[data-search-open]')) setOpen(true);
  else if (target.closest('[data-search-close], [data-search-overlay]')) setOpen(false);
});

document.addEventListener('input', (event) => {
  if (!(event.target as Element).matches('[data-search-input]')) return;
  results = search((event.target as HTMLInputElement).value);
  render();
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    setOpen(!isOpen());
    return;
  }
  if (!isOpen()) return;
  if (event.key === 'Escape') {
    setOpen(false);
    return;
  }
  if (!results || event.isComposing) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    let i = results.findIndex((result) => result.id === active);
    if (i === -1) i = 0;
    else i += event.key === 'ArrowDown' ? 1 : -1;
    setActive(results.at(i % results.length)?.id ?? null);
    event.preventDefault();
  }
  if (event.key === 'Enter') {
    const selected = results.find((result) => result.id === active);
    if (selected) open(selected);
    event.preventDefault();
  }
});

// Keep the list height animated like Fumadocs (--fd-animated-height).
const resize = new ResizeObserver(() => {
  const list = el<HTMLElement>('[data-search-list]');
  const viewport = el<HTMLElement>('[data-search-viewport]');
  if (list && viewport) list.style.setProperty('--fd-animated-height', `${viewport.clientHeight}px`);
});

document.addEventListener('astro:page-load', () => {
  const viewport = el('[data-search-viewport]');
  if (viewport) resize.observe(viewport);
  results = null;
  const input = el<HTMLInputElement>('[data-search-input]');
  if (input) input.value = '';
});
