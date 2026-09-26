import { createIdbStore } from "$lib/utils/idb-store";
import type { EditRecord } from "./edits";
import type { AiErrorCode, AiMessage } from "./protocol";

/** What the sidebar shows. The model sees `transcript` instead. */
export type ChatEntry =
	| { id: string; kind: "user"; text: string }
	| { id: string; kind: "assistant"; text: string }
	| { id: string; kind: "edit"; edit: EditRecord }
	| { id: string; kind: "notice"; text: string; code?: AiErrorCode | "network" | "unauthorized" };

export type ChatRecord = {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
	entries: ChatEntry[];
	transcript: AiMessage[];
	/** Things the user did that the model should hear about with the next message (undos). */
	pendingNotes: string[];
};

/** Chats stay in this browser (IndexedDB), like the page drafts. */
const store = createIdbStore<ChatRecord>("capsulo-ai-chats", "chats");
const MAX_STORED_CHATS = 50;

export async function listChats(): Promise<ChatRecord[]> {
	const chats = await store.getAll();
	return chats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveChat(chat: ChatRecord): Promise<void> {
	// Svelte state proxies can't be structured-cloned; store plain JSON.
	await store.put(chat.id, JSON.parse(JSON.stringify(chat)) as ChatRecord);
	const chats = await listChats();
	for (const old of chats.slice(MAX_STORED_CHATS)) await store.delete(old.id);
}

export function createId(): string {
	return typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createChat(): ChatRecord {
	const now = new Date().toISOString();
	return { id: createId(), title: "New chat", createdAt: now, updatedAt: now, entries: [], transcript: [], pendingNotes: [] };
}

export function titleFromMessage(text: string): string {
	const singleLine = text.replace(/\s+/g, " ").trim();
	return singleLine.length > 60 ? `${singleLine.slice(0, 57)}…` : singleLine || "New chat";
}
