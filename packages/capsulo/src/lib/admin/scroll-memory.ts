/**
 * Remembers how far a scroll container was scrolled, per key, and puts it back when the
 * container shows that key again (returning to a page, reloading the tab...).
 */
import type { Attachment } from "svelte/attachments";
import { isNumber, readUiState, writeUiState } from "./ui-state";

/** Content that loads after mount (data, the preview iframe) gets this long to grow tall enough. */
const RESTORE_WINDOW_MS = 2000;
const SAVE_DELAY_MS = 250;

const storageKey = (key: string) => `scroll:${key}`;

/**
 * Restores and then tracks `element`'s scroll position under `key`. Use as
 * `{@attach rememberScroll(key)}`; a new key (another commit, another page) saves the old
 * position and restores the new one, which starts at the top when it was never scrolled.
 */
export function rememberScroll(key: string): Attachment<HTMLElement> {
	return (element) => {
		const target = readUiState(storageKey(key), isNumber) ?? 0;
		let restoring = target > 0;
		// Kept as the editor scrolls: on unmount the element is already detached and reads 0.
		let position = target;
		let saveTimer: ReturnType<typeof setTimeout> | undefined;

		function save(): void {
			clearTimeout(saveTimer);
			writeUiState(storageKey(key), position);
		}

		function stopRestoring(): void {
			if (!restoring) return;
			restoring = false;
			resizeObserver.disconnect();
			clearTimeout(restoreTimeout);
		}

		/** Scrolls to the saved position once the content is tall enough to reach it. */
		function tryRestore(): void {
			if (!restoring) return;
			const reachable = element.scrollHeight - element.clientHeight;
			element.scrollTop = Math.min(target, reachable);
			if (reachable >= target) stopRestoring();
		}

		const resizeObserver = new ResizeObserver(tryRestore);
		const restoreTimeout = setTimeout(stopRestoring, RESTORE_WINDOW_MS);

		if (restoring) {
			resizeObserver.observe(element);
			for (const child of element.children) resizeObserver.observe(child);
			tryRestore();
		} else {
			element.scrollTop = 0;
		}

		function onScroll(): void {
			if (restoring) return;
			position = Math.round(element.scrollTop);
			clearTimeout(saveTimer);
			saveTimer = setTimeout(save, SAVE_DELAY_MS);
		}

		// The editor taking over: their scroll wins over a restore still waiting for content.
		const interactions = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
		for (const type of interactions) element.addEventListener(type, stopRestoring, { passive: true });
		element.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("pagehide", save);

		return () => {
			// Still waiting to restore: the saved position stands.
			if (!restoring) save();
			stopRestoring();
			for (const type of interactions) element.removeEventListener(type, stopRestoring);
			element.removeEventListener("scroll", onScroll);
			window.removeEventListener("pagehide", save);
		};
	};
}
