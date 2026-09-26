import type { SchemaValues } from "$lib/form-builder/core/types";
import { createIdbStore } from "$lib/utils/idb-store";

/**
 * Unsaved global variables. The Global Variables editor keeps its edits here until Save,
 * and the AI agent writes its edits here too, so neither is lost by leaving the page and
 * nothing reaches the site until someone presses Save.
 */
const store = createIdbStore<GlobalsDraft>("capsulo-globals-draft", "drafts");
const DRAFT_KEY = "globals";

/** Dispatched when something other than the Global Variables editor rewrote the draft. */
export const GLOBALS_DRAFT_REPLACED_EVENT = "capsulo:globals-draft-replaced";

export type GlobalsDraft = {
	values: SchemaValues;
	updatedAt: string;
};

export function loadGlobalsDraft(): Promise<GlobalsDraft | null> {
	return store.get(DRAFT_KEY);
}

export async function saveGlobalsDraft(values: SchemaValues): Promise<boolean> {
	const plainValues = JSON.parse(JSON.stringify(values)) as SchemaValues;
	return store.put(DRAFT_KEY, { values: plainValues, updatedAt: new Date().toISOString() });
}

export function clearGlobalsDraft(): Promise<boolean> {
	return store.delete(DRAFT_KEY);
}

export function notifyGlobalsDraftReplaced(): void {
	if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(GLOBALS_DRAFT_REPLACED_EVENT));
}
