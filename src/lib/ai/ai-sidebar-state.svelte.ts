/**
 * Whether the AI sidebar is open. Shared by the nav button and the sidebar (both
 * islands import this module, so they share one instance) and remembered per browser.
 * AdminLayout reads the same key before first paint so the panel doesn't pop in.
 */
export const AI_SIDEBAR_STORAGE_KEY = "capsulo-ai-sidebar-open";

function readStoredOpen(): boolean {
	try {
		return typeof localStorage !== "undefined" && localStorage.getItem(AI_SIDEBAR_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

export const aiSidebar = $state({ open: readStoredOpen() });

export function setAiSidebarOpen(open: boolean): void {
	aiSidebar.open = open;
	if (open) document.documentElement.dataset.aiSidebar = "open";
	else delete document.documentElement.dataset.aiSidebar;
	try {
		localStorage.setItem(AI_SIDEBAR_STORAGE_KEY, open ? "1" : "0");
	} catch {
		// Private mode: the panel just won't be remembered.
	}
}

export function toggleAiSidebar(): void {
	setAiSidebarOpen(!aiSidebar.open);
}

/** ⌘. / Ctrl+. — free in browsers and in the rich editor. */
export function isAiSidebarShortcut(event: KeyboardEvent): boolean {
	return event.key === "." && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
}
