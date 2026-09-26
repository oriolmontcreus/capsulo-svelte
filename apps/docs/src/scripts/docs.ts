/**
 * Client behaviour of the docs layout, ported from Fumadocs' React components:
 * theme toggle, collapsible and mobile sidebar, sidebar folders, table of contents
 * and code copy buttons. The layout uses Astro's client router, so clicks are
 * handled by delegation (bound once) and per-page state is set up on astro:page-load.
 */

const root = document.documentElement;

// ---------------------------------------------------------------------------
// Theme

function applyTheme(theme: 'light' | 'dark', target: HTMLElement = root) {
  target.classList.toggle('dark', theme === 'dark');
  target.classList.toggle('light', theme === 'light');
  target.style.colorScheme = theme;
}

function toggleTheme() {
  const next = root.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem('theme', next);
  } catch {}
}

// ---------------------------------------------------------------------------
// Collapsible sections (sidebar folders, mobile table of contents)

function setCollapsible(content: HTMLElement, open: boolean, animate: boolean) {
  if ((content.dataset.state === 'open') === open) return;
  content.toggleAttribute('data-animated', animate);
  if (open) {
    content.hidden = false;
    content.style.setProperty('--radix-collapsible-content-height', `${content.scrollHeight}px`);
    content.dataset.state = 'open';
  } else {
    content.style.setProperty('--radix-collapsible-content-height', `${content.scrollHeight}px`);
    content.dataset.state = 'closed';
    if (!animate) {
      content.hidden = true;
      return;
    }
    content.addEventListener(
      'animationend',
      () => {
        if (content.dataset.state === 'closed') content.hidden = true;
      },
      { once: true },
    );
  }
}

// Folders the reader opened or closed by hand, kept across client-side navigation.
const folderState = new Map<string, boolean>();

function setFolder(folder: HTMLElement, open: boolean, animate: boolean) {
  const state = open ? 'open' : 'closed';
  folder.dataset.state = state;
  const trigger = folder.querySelector<HTMLElement>(':scope > [data-folder-trigger]');
  if (trigger) trigger.dataset.state = state;
  trigger?.querySelector('[data-icon]')?.classList.toggle('-rotate-90', !open);
  const content = folder.querySelector<HTMLElement>(':scope > [data-collapsible-content]');
  if (content) setCollapsible(content, open, animate);
}

function restoreFolders() {
  for (const folder of document.querySelectorAll<HTMLElement>('[data-folder]')) {
    const stored = folderState.get(folder.dataset.folder!);
    if (stored === undefined) continue;
    const hasActive = folder.querySelector('[data-active="true"]') !== null;
    // Like Fumadocs, the folder holding the current page always opens.
    setFolder(folder, stored || hasActive, false);
  }
}

// ---------------------------------------------------------------------------
// Sidebar

let closeHoverUntil = 0;
let hoverTimer = 0;

function toggleCollapsed() {
  const collapsed = !root.hasAttribute('data-sidebar-collapsed');
  root.toggleAttribute('data-sidebar-collapsed', collapsed);
  document.getElementById('nd-sidebar')?.removeAttribute('data-hover');
  closeHoverUntil = Date.now() + 150;
}

function bindSidebarHover() {
  const sidebar = document.getElementById('nd-sidebar');
  if (!sidebar) return;
  sidebar.addEventListener('pointerenter', (event) => {
    if (!root.hasAttribute('data-sidebar-collapsed') || event.pointerType === 'touch' || closeHoverUntil > Date.now()) return;
    window.clearTimeout(hoverTimer);
    sidebar.setAttribute('data-hover', '');
  });
  sidebar.addEventListener('pointerleave', (event) => {
    if (!root.hasAttribute('data-sidebar-collapsed') || event.pointerType === 'touch') return;
    window.clearTimeout(hoverTimer);
    const nearEdge = Math.min(event.clientX, document.body.clientWidth - event.clientX) <= 100;
    hoverTimer = window.setTimeout(
      () => {
        sidebar.removeAttribute('data-hover');
        closeHoverUntil = Date.now() + 150;
      },
      nearEdge ? 500 : 0,
    );
  });
}

function setMobileSidebar(open: boolean) {
  const aside = document.getElementById('nd-sidebar-mobile');
  const overlay = document.querySelector<HTMLElement>('[data-sidebar-overlay]');
  for (const element of [aside, overlay]) {
    if (!element) continue;
    element.dataset.state = open ? 'open' : 'closed';
    if (open) {
      element.hidden = false;
    } else {
      element.addEventListener(
        'animationend',
        () => {
          if (element.dataset.state === 'closed') element.hidden = true;
        },
        { once: true },
      );
    }
  }
}

let sidebarScroll = 0;

// ---------------------------------------------------------------------------
// Table of contents (same rules as fumadocs-core's anchor observer)

let tocCleanup: (() => void) | undefined;

function setupToc() {
  tocCleanup?.();
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-items] a[href^="#"]')];
  const ids = [...new Set(links.map((link) => decodeURIComponent(link.hash.slice(1))))];
  if (ids.length === 0) {
    tocCleanup = undefined;
    return;
  }

  let visible: string[] = [];
  let active: string[] = [];

  const render = () => {
    for (const link of links) {
      link.dataset.active = String(active.includes(decodeURIComponent(link.hash.slice(1))));
    }
    for (const container of document.querySelectorAll<HTMLElement>('[data-toc]')) {
      const thumb = container.querySelector<HTMLElement>('[data-toc-thumb]');
      if (!thumb || container.clientHeight === 0) continue;
      let upper = Number.MAX_VALUE;
      let lower = 0;
      for (const id of active) {
        const element = container.querySelector<HTMLElement>(`a[href="#${CSS.escape(id)}"]`);
        if (!element) continue;
        const styles = getComputedStyle(element);
        upper = Math.min(upper, element.offsetTop + parseFloat(styles.paddingTop));
        lower = Math.max(lower, element.offsetTop + element.clientHeight - parseFloat(styles.paddingBottom));
      }
      const [top, height] = active.length === 0 || upper === Number.MAX_VALUE ? [0, 0] : [upper, lower - upper];
      thumb.style.setProperty('--fd-top', `${top}px`);
      thumb.style.setProperty('--fd-height', `${height}px`);

      // Keep the first active item in view, like Fumadocs' ScrollProvider.
      const first = container.querySelector<HTMLElement>('a[data-active="true"]');
      if (first && container.scrollHeight > container.clientHeight) {
        const { offsetTop } = first;
        if (offsetTop < container.scrollTop || offsetTop > container.scrollTop + container.clientHeight - first.clientHeight) {
          container.scrollTo({ top: offsetTop - container.clientHeight / 2, behavior: 'smooth' });
        }
      }
    }
    updateTocNav(ids, active[0]);
  };

  const setActive = (next: string[]) => {
    active = next;
    render();
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = entry.target.id;
        if (entry.isIntersecting && !visible.includes(id)) visible = [...visible, id];
        else if (!entry.isIntersecting && visible.includes(id)) visible = visible.filter((v) => v !== id);
      }
      if (visible.length > 0) setActive(ids.filter((id) => visible.includes(id)));
    },
    { rootMargin: '-20px 0% -40% 0%', threshold: 1 },
  );

  const onScroll = () => {
    const element = document.scrollingElement;
    if (!element) return;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 6) {
      setActive(active.length > 0 ? ids.slice(ids.indexOf(active[0])) : ids.slice(-1));
    }
  };

  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) observer.observe(element);
  }
  const resize = new ResizeObserver(render);
  for (const container of document.querySelectorAll('[data-toc]')) resize.observe(container);

  onScroll();
  render();
  window.addEventListener('scroll', onScroll);
  tocCleanup = () => {
    window.removeEventListener('scroll', onScroll);
    observer.disconnect();
    resize.disconnect();
  };
}

function updateTocNav(ids: string[], current: string | undefined) {
  const trigger = document.querySelector<HTMLElement>('[data-tocnav-trigger]');
  if (!trigger) return;
  const open = trigger.dataset.state === 'open';
  const selected = current ? ids.indexOf(current) : -1;
  const showItem = selected !== -1 && !open;

  const progress = trigger.querySelector<SVGCircleElement>('[data-tocnav-progress]');
  if (progress) {
    const circumference = Number(progress.dataset.circumference);
    const value = Math.min(1, Math.max(0, (selected + 1) / Math.max(1, ids.length)));
    progress.setAttribute('stroke-dashoffset', String(circumference - value * circumference));
  }

  const title = trigger.querySelector<HTMLElement>('[data-tocnav-title]');
  const currentLabel = trigger.querySelector<HTMLElement>('[data-tocnav-current]');
  title?.toggleAttribute('data-hidden', showItem);
  currentLabel?.toggleAttribute('data-hidden', !showItem);
  if (currentLabel && selected !== -1) {
    const link = document.querySelector<HTMLElement>(`[data-toc-items] a[href="#${CSS.escape(ids[selected])}"]`);
    currentLabel.textContent = link?.textContent ?? '';
  }
}

function setTocNav(open: boolean) {
  const header = document.getElementById('nd-tocnav');
  const trigger = header?.querySelector<HTMLElement>('[data-tocnav-trigger]');
  const content = header?.querySelector<HTMLElement>('[data-tocnav-content]');
  if (!header || !trigger || !content) return;
  const state = open ? 'open' : 'closed';
  header.dataset.state = state;
  trigger.dataset.state = state;
  setCollapsible(content, open, true);
  // Re-run the toc render so the label and thumb reflect the new state.
  window.dispatchEvent(new Event('scroll'));
  const current = document.querySelector<HTMLElement>('#nd-toc [data-toc-items] a[data-active="true"]');
  const ids = [...document.querySelectorAll<HTMLAnchorElement>('#nd-toc [data-toc-items] a')].map((a) =>
    decodeURIComponent(a.hash.slice(1)),
  );
  updateTocNav(ids, current ? decodeURIComponent((current as HTMLAnchorElement).hash.slice(1)) : undefined);
}

// ---------------------------------------------------------------------------
// Delegated clicks (bound once for the whole session)

document.addEventListener('click', (event) => {
  const target = event.target as Element;

  if (target.closest('[data-theme-toggle]')) return toggleTheme();
  if (target.closest('[data-sidebar-collapse]')) return toggleCollapsed();

  if (target.closest('[data-sidebar-toggle]')) {
    const open = document.getElementById('nd-sidebar-mobile')?.dataset.state === 'open';
    return setMobileSidebar(!open);
  }
  if (target.closest('[data-sidebar-overlay]')) return setMobileSidebar(false);

  const folderTrigger = target.closest('[data-folder-trigger]');
  if (folderTrigger) {
    const folder = folderTrigger.parentElement as HTMLElement;
    const open = folder.dataset.state !== 'open';
    folderState.set(folder.dataset.folder!, open);
    for (const same of document.querySelectorAll<HTMLElement>(`[data-folder="${CSS.escape(folder.dataset.folder!)}"]`)) {
      setFolder(same, open, same === folder);
    }
    return;
  }

  if (target.closest('[data-tocnav-trigger]')) {
    const open = document.getElementById('nd-tocnav')?.dataset.state === 'open';
    return setTocNav(!open);
  }
  if (target.closest('#nd-tocnav [data-toc-items] a')) return setTocNav(false);

  const tab = target.closest<HTMLElement>('[data-tab-trigger]');
  if (tab) {
    const tabs = tab.closest('[data-tabs]')!;
    const value = tab.dataset.tabTrigger!;
    for (const trigger of tabs.querySelectorAll<HTMLElement>(':scope > [role="tablist"] > [data-tab-trigger]')) {
      const selected = trigger === tab;
      trigger.dataset.state = selected ? 'active' : 'inactive';
      trigger.setAttribute('aria-selected', String(selected));
    }
    for (const panel of tabs.querySelectorAll<HTMLElement>(':scope > [data-tab-value]')) {
      panel.dataset.state = panel.dataset.tabValue === value ? 'active' : 'inactive';
    }
    return;
  }

  const filesFolder = target.closest<HTMLElement>('[data-files-folder-trigger]');
  if (filesFolder) {
    const folder = filesFolder.parentElement as HTMLElement;
    const open = folder.dataset.state !== 'open';
    const state = open ? 'open' : 'closed';
    folder.dataset.state = state;
    filesFolder.dataset.state = state;
    const content = folder.querySelector<HTMLElement>(':scope > [data-collapsible-content]');
    if (content) setCollapsible(content, open, true);
    return;
  }

  const typeTableTrigger = target.closest<HTMLElement>('[data-type-table-trigger]');
  if (typeTableTrigger) {
    const item = typeTableTrigger.closest<HTMLElement>('[data-type-table-item]')!;
    const content = document.getElementById(typeTableTrigger.getAttribute('aria-controls')!)!;
    const open = item.dataset.state !== 'open';
    const state = open ? 'open' : 'closed';
    item.dataset.state = state;
    typeTableTrigger.dataset.state = state;
    typeTableTrigger.setAttribute('aria-expanded', String(open));
    content.dataset.state = state;
    content.hidden = !open;
    return;
  }

  // Preview code dialogs are native <dialog>s: Escape and focus handling come for free.
  const dialogTrigger = target.closest<HTMLElement>('[data-code-dialog-trigger]');
  if (dialogTrigger) {
    (document.getElementById(dialogTrigger.getAttribute('aria-controls')!) as HTMLDialogElement).showModal();
    return;
  }

  const dialog = target.closest<HTMLDialogElement>('dialog[data-code-dialog]');
  if (dialog) {
    // A click on the backdrop lands on the <dialog> itself, outside its box.
    const rect = dialog.getBoundingClientRect();
    const outside =
      target === dialog &&
      (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    if (outside || target.closest('[data-code-dialog-close]')) {
      dialog.close();
      return;
    }
  }

  const copyMarkdown = target.closest<HTMLButtonElement>('[data-copy-markdown]');
  if (copyMarkdown) {
    void copyPageMarkdown(copyMarkdown);
    return;
  }

  const popoverTrigger = target.closest<HTMLElement>('[data-menu-trigger]');
  if (popoverTrigger) {
    const popover = popoverTrigger.closest<HTMLElement>('[data-menu]')!;
    setPopover(popover, popoverTrigger.dataset.state !== 'open');
    return;
  }

  const copy = target.closest<HTMLElement>('[data-copy-code]');
  if (copy) {
    const code = copy.closest('figure')?.querySelector('pre')?.textContent ?? '';
    void navigator.clipboard.writeText(code).then(() => {
      copy.setAttribute('data-checked', '');
      window.setTimeout(() => copy.removeAttribute('data-checked'), 1500);
    });
  }
});

// Close the mobile table of contents and open popovers when clicking outside them.
document.addEventListener('pointerdown', (event) => {
  const header = document.getElementById('nd-tocnav');
  if (header?.dataset.state === 'open' && !header.contains(event.target as Node)) setTocNav(false);
  for (const popover of document.querySelectorAll<HTMLElement>('[data-menu]')) {
    if (!popover.contains(event.target as Node)) setPopover(popover, false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const popover of document.querySelectorAll<HTMLElement>('[data-menu]')) setPopover(popover, false);
});

// ---------------------------------------------------------------------------
// Page actions

const markdownCache = new Map<string, string>();

async function copyPageMarkdown(button: HTMLButtonElement) {
  const url = button.dataset.copyMarkdown!;
  button.disabled = true;
  try {
    let text = markdownCache.get(url);
    if (text === undefined) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch markdown: ${response.status} ${response.statusText}`);
      text = await response.text();
      markdownCache.set(url, text);
    }
    await navigator.clipboard.writeText(text);
    button.setAttribute('data-checked', '');
    window.setTimeout(() => button.removeAttribute('data-checked'), 1500);
  } catch (error) {
    console.error('Failed to copy markdown:', error);
  } finally {
    button.disabled = false;
  }
}

function setPopover(popover: HTMLElement, open: boolean) {
  const trigger = popover.querySelector<HTMLElement>('[data-menu-trigger]');
  const content = popover.querySelector<HTMLElement>('[data-menu-content]');
  if (!trigger || !content || (trigger.dataset.state === 'open') === open) return;
  const state = open ? 'open' : 'closed';
  trigger.dataset.state = state;
  content.dataset.state = state;
  if (open) {
    content.hidden = false;
  } else {
    content.addEventListener(
      'animationend',
      () => {
        if (content.dataset.state === 'closed') content.hidden = true;
      },
      { once: true },
    );
  }
}

// ---------------------------------------------------------------------------
// Client-side navigation

document.addEventListener('astro:before-swap', (event) => {
  // The router replaces <html> attributes with the new page's; keep the theme and
  // sidebar state so nothing flashes (same fix as the admin's Layout.astro).
  const next = event.newDocument.documentElement;
  applyTheme(root.classList.contains('dark') ? 'dark' : 'light', next);
  next.toggleAttribute('data-sidebar-collapsed', root.hasAttribute('data-sidebar-collapsed'));
  sidebarScroll = document.querySelector('[data-sidebar-viewport]')?.scrollTop ?? 0;
});

document.addEventListener('astro:page-load', () => {
  restoreFolders();
  const viewport = document.querySelector('[data-sidebar-viewport]');
  if (viewport) viewport.scrollTop = sidebarScroll;
  bindSidebarHover();
  setupToc();
});
