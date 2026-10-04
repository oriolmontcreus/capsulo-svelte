/**
 * Once the admin is idle, loads what the other admin pages show so opening them is instant:
 * each page renders its cached data at once and only revalidates it (see admin-cache.ts).
 * Runs again on later navigations or when the tab comes back, at most once a minute.
 */
import { get } from "svelte/store";
import { warmPage } from "../admin-i18n/navigation-preload";
import { syncGlobalsDraft } from "../globals/globals-draft";
import { ensureGlobalsLoaded, globalsStore } from "../globals/globals-store.svelte";
import { loadRevisionWithParent, revalidateCommitList } from "../PageEditor/history/history-documents";
import { loadAllPageEditorCacheDocuments } from "../PageEditor/page-editor-cache";
import { ensureSession, session } from "../stores/session";
import { onAdminCacheClear } from "./admin-cache";

const NAV_HREFS = ["/admin/page-editor", "/admin/globals", "/admin/changes", "/admin/history"];
const REWARM_AFTER_MS = 60_000;

let lastWarmAt = 0;

onAdminCacheClear(() => (lastWarmAt = 0));

function onRoute(prefix: string): boolean {
	return location.pathname === prefix || location.pathname.startsWith(`${prefix}/`);
}

async function warmHistory(): Promise<void> {
	const { list } = await revalidateCommitList();
	// The newest commit is what History opens on.
	const revision = list?.commits[0]?.revisions[0];
	if (revision) await loadRevisionWithParent(revision.pageId, revision.revisionId);
}

async function warmGlobals(): Promise<void> {
	// Once loaded, the store follows the draft, so a sync is enough to bring it up to date.
	if (globalsStore.loaded) await syncGlobalsDraft();
	else await ensureGlobalsLoaded();
}

async function warm(): Promise<void> {
	if (Date.now() - lastWarmAt < REWARM_AFTER_MS) return;
	lastWarmAt = Date.now();

	await ensureSession();
	if (!get(session)) return;

	// Each page revalidates its own data when shown, so the current one is left to it.
	// The local drafts (Page editor, Changes) cost no request.
	const tasks: Promise<unknown>[] = [loadAllPageEditorCacheDocuments()];
	if (!onRoute("/admin/history")) tasks.push(warmHistory());
	if (!onRoute("/admin/globals")) tasks.push(warmGlobals());
	await Promise.allSettled(tasks);

	for (const href of NAV_HREFS) warmPage(href);
}

function warmWhenIdle(): void {
	const run = () => void warm().catch(() => undefined);
	if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 2000 });
	else setTimeout(run, 300);
}

document.addEventListener("astro:page-load", warmWhenIdle);
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible") warmWhenIdle();
});
warmWhenIdle();
