/**
 * Where the editor left each part of the admin (open page, selected commit, scroll, folded
 * capsules, editing language...), kept per tab: it survives a reload and goes with the tab.
 * Storage can be unavailable (private windows, blocked site data); the state then lives in
 * memory only.
 */
import { onAdminCacheClear } from "./admin-cache";

const PREFIX = "capsulo:ui:";

const memory = new Map<string, unknown>();

function storage(): Storage | null {
	try {
		return typeof sessionStorage === "undefined" ? null : sessionStorage;
	} catch {
		return null;
	}
}

/** The stored value, or undefined when there is none or it no longer passes `isValid`. */
export function readUiState<T>(key: string, isValid: (value: unknown) => value is T): T | undefined {
	let value = memory.get(key);
	if (value === undefined) {
		try {
			const raw = storage()?.getItem(PREFIX + key);
			value = raw == null ? undefined : JSON.parse(raw);
		} catch {
			value = undefined;
		}
		if (value !== undefined) memory.set(key, value);
	}
	return isValid(value) ? value : undefined;
}

export function writeUiState(key: string, value: unknown): void {
	memory.set(key, value);
	try {
		storage()?.setItem(PREFIX + key, JSON.stringify(value));
	} catch {
		// Quota or blocked storage: memory still has it for this session.
	}
}

function clearUiState(): void {
	memory.clear();
	const store = storage();
	if (!store) return;
	try {
		for (const key of Object.keys(store)) {
			if (key.startsWith(PREFIX)) store.removeItem(key);
		}
	} catch {}
}

// Another editor signing in on this tab starts from a clean admin.
onAdminCacheClear(clearUiState);

export const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((entry) => typeof entry === "string");
