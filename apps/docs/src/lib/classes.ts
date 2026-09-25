// Class strings from fumadocs-ui@16.0.2 (MIT), kept identical so the docs look the same.

const buttonBase =
  'inline-flex items-center justify-center text-sm font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring';

/**
 * buttonVariants({ color: 'ghost', size: 'icon-sm' }). Fumadocs merged padding and
 * radius overrides with tailwind-merge; here they are parameters instead.
 */
export function ghostIconButton({ padding = 'p-1.5', rounded = 'rounded-md' } = {}): string {
  return `${buttonBase} ${rounded} hover:bg-fd-accent hover:text-fd-accent-foreground ${padding} [&_svg]:size-4.5`;
}

const sidebarItemBase =
  'relative flex flex-row items-center gap-2 rounded-lg p-2 ps-(--sidebar-item-offset) text-start text-fd-muted-foreground [overflow-wrap:anywhere] [&_svg]:size-4 [&_svg]:shrink-0';

const sidebarItemActive = 'bg-fd-primary/10 text-fd-primary';
const sidebarItemIdle =
  'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none';

export function sidebarItem(active: boolean): string {
  return `${sidebarItemBase} ${active ? sidebarItemActive : sidebarItemIdle}`;
}

export const tocItem =
  'prose py-1.5 text-sm text-fd-muted-foreground transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-fd-primary';

export function tocItemIndent(depth: number): string {
  if (depth <= 2) return 'ps-3';
  if (depth === 3) return 'ps-6';
  return 'ps-8';
}
