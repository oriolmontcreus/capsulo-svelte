/**
 * Each admin section reopens where it was left, like a window: the nav links to the last URL
 * seen in the section (page open, commit selected, folder...). Pages keep that state in their
 * query string; this only remembers it.
 */
import { readUiState, writeUiState } from "./ui-state";

export type AdminSection = "page-editor" | "globals" | "changes" | "history";

const SECTION_ROOTS: Record<AdminSection, string> = {
	"page-editor": "/admin/page-editor",
	globals: "/admin/globals",
	changes: "/admin/changes",
	history: "/admin/history"
};

/**
 * The query parameters that say where a section is. Anything else is one-off, like the
 * `focus`/`field`/`locale` of a "Fix this" link, which must not fire again on every return.
 */
const KEPT_PARAMS: Record<AdminSection, string[]> = {
	"page-editor": ["path"],
	globals: [],
	changes: ["page"],
	history: ["commit", "page"]
};

const STORAGE_KEY = "section-locations";

const isLocations = (value: unknown): value is Partial<Record<AdminSection, string>> =>
	typeof value === "object" &&
	value !== null &&
	Object.entries(value).every(
		([section, href]) => section in SECTION_ROOTS && typeof href === "string" && href.startsWith(SECTION_ROOTS[section as AdminSection])
	);

const locations = $state<Partial<Record<AdminSection, string>>>(
	(typeof window === "undefined" ? undefined : readUiState(STORAGE_KEY, isLocations)) ?? {}
);

function sectionOf(pathname: string): AdminSection | null {
	for (const [section, root] of Object.entries(SECTION_ROOTS) as [AdminSection, string][]) {
		if (pathname === root || pathname.startsWith(`${root}/`)) return section;
	}
	return null;
}

function remember(url: URL): void {
	const section = sectionOf(url.pathname);
	if (!section) return;

	const kept = new URLSearchParams();
	for (const name of KEPT_PARAMS[section]) {
		const value = url.searchParams.get(name);
		if (value !== null) kept.set(name, value);
	}
	const query = kept.toString();
	const href = query ? `${url.pathname}?${query}` : url.pathname;
	if (locations[section] === href) return;

	locations[section] = href;
	writeUiState(STORAGE_KEY, $state.snapshot(locations));
}

/** Where the nav takes a section: its root while in it, otherwise where it was left. */
export function sectionHref(section: AdminSection, isActive: boolean): string {
	if (isActive) return SECTION_ROOTS[section];
	return locations[section] ?? SECTION_ROOTS[section];
}

if (typeof window !== "undefined") {
	// The address bar still shows the page being left, including what it wrote with
	// replaceState (the router's own `event.from` does not see those).
	document.addEventListener("astro:before-preparation", () => remember(new URL(location.href)));
	// A reload or a link out of the client router.
	window.addEventListener("pagehide", () => remember(new URL(location.href)));
	remember(new URL(location.href));
}
