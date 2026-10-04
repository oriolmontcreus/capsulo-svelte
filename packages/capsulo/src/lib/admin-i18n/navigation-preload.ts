/**
 * Admin pages are prerendered in BUILD_UI_LOCALE and each island switches to the editor's language
 * when it hydrates. Two things keep the build language from ever being painted:
 * - the next page's island code is loaded before the client router swaps the page in (and warmed
 *   when a link is hovered or focused). With its modules loaded, an island hydrates in the same
 *   task as the swap, so the first frame is already translated;
 * - on a first load while the editor's language differs from the build's, and on every client-side
 *   navigation, islands stay invisible until they have hydrated (`html[data-ui-pending]`, see
 *   AdminLanguageGuard.astro).
 */
import type {
	TransitionBeforePreparationEvent,
	TransitionBeforeSwapEvent
} from "astro:transitions/client";
import { BUILD_UI_LOCALE } from "./core";
import { getUiLocale } from "./i18n.svelte";

const PENDING_ATTRIBUTE = "data-ui-pending";
/** What an `astro-island` imports before it hydrates. */
const ISLAND_URL_ATTRIBUTES = ["component-url", "renderer-url", "before-hydration-url"];
/** A slow network never holds a navigation longer than this; the CSS guard covers the rest. */
const MAX_PRELOAD_WAIT_MS = 2500;
const INTENT_DELAY_MS = 80;
/** If an island fails to hydrate, show the page anyway. */
const REVEAL_FALLBACK_MS = 3000;

const loadedModules = new Map<string, Promise<unknown>>();
const warmedPages = new Set<string>();

function isAdminUrl(url: URL): boolean {
	return url.origin === location.origin && (url.pathname === "/admin" || url.pathname.startsWith("/admin/"));
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Imports every module the page's islands need. Same URLs as `astro-island`, so it reuses them. */
function preloadIslands(page: Document): Promise<unknown> {
	const loads: Promise<unknown>[] = [];
	for (const island of page.querySelectorAll("astro-island")) {
		for (const attribute of ISLAND_URL_ATTRIBUTES) {
			const value = island.getAttribute(attribute);
			if (!value) continue;
			const url = new URL(value, document.baseURI).href;
			let load = loadedModules.get(url);
			if (!load) {
				// A failed import is left to astro-island, which retries it.
				load = import(/* @vite-ignore */ url).catch(() => undefined);
				loadedModules.set(url, load);
			}
			loads.push(load);
		}
	}
	return Promise.all(loads);
}

/** Loads an admin page's island code ahead of a visit; a no-op for the current or an already warmed page. */
export function warmPage(href: string): void {
	const url = new URL(href, location.href);
	url.hash = "";
	if (!isAdminUrl(url) || url.pathname === location.pathname || warmedPages.has(url.href)) return;
	warmedPages.add(url.href);
	fetch(url, { credentials: "same-origin" })
		.then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
		.then((html) => preloadIslands(new DOMParser().parseFromString(html, "text/html")))
		.catch(() => warmedPages.delete(url.href));
}

let intentTimer: ReturnType<typeof setTimeout> | undefined;

function onLinkIntent(event: Event): void {
	const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
	if (!(anchor instanceof HTMLAnchorElement)) return;
	clearTimeout(intentTimer);
	intentTimer = setTimeout(() => warmPage(anchor.href), INTENT_DELAY_MS);
}

let revealTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleReveal(): void {
	clearTimeout(revealTimer);
	revealTimer = setTimeout(() => document.documentElement.removeAttribute(PENDING_ATTRIBUTE), REVEAL_FALLBACK_MS);
}

document.addEventListener("astro:before-preparation", (event) => {
	const preparation = event as TransitionBeforePreparationEvent;
	if (!isAdminUrl(preparation.to)) return;
	const load = preparation.loader;
	preparation.loader = async () => {
		await load();
		await Promise.race([preloadIslands(preparation.newDocument), wait(MAX_PRELOAD_WAIT_MS)]);
	};
});

// The router copies <html> attributes from the incoming page, so the guard is set there.
document.addEventListener("astro:before-swap", (event) => {
	const swap = event as TransitionBeforeSwapEvent;
	// The previous page's fallback must not reveal this one; page-load schedules a new one.
	clearTimeout(revealTimer);
	if (!isAdminUrl(swap.to)) return;
	// Islands hydrate a frame or so after the swap. Until then they hold their prerendered
	// markup: the build language and, on pages that render cached data, a "Loading..." state
	// the hydrated island skips. Hiding them for that frame keeps either from being painted.
	// The login page is left out: its media-gated islands may never hydrate.
	if (getUiLocale() !== BUILD_UI_LOCALE || swap.to.pathname !== "/admin/login") {
		swap.newDocument.documentElement.setAttribute(PENDING_ATTRIBUTE, "");
	}
});

document.addEventListener("astro:page-load", scheduleReveal);
document.addEventListener("pointerover", onLinkIntent, { passive: true });
document.addEventListener("focusin", onLinkIntent);
scheduleReveal();
