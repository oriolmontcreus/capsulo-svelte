import type {
	PageEditorCachedDocument,
	PageEditorValuesByInstance
} from "./persistence";
import {
	deserializePageEditorValues,
	serializePageEditorValues
} from "./persistence";

const PAGE_EDITOR_DB_NAME = "page-editor-cache";
const PAGE_EDITOR_DB_VERSION = 2;
const PAGE_EDITOR_STORE_NAME = "documents";

/**
 * Dispatched after every draft write (autosave, commit, Recover, AI edits...) so the
 * AdminNav dirty-count badge and an open Changes page can refresh without polling.
 */
export const CHANGES_UPDATED_EVENT = "capsulo:changes-updated";

/** Carries the same signal to the admin open in other tabs, which share the cache. */
const CHANGES_CHANNEL_NAME = "capsulo:changes";

let changesChannel: BroadcastChannel | null = null;

function getChangesChannel(): BroadcastChannel | null {
	if (typeof BroadcastChannel === "undefined") return null;
	changesChannel ??= new BroadcastChannel(CHANGES_CHANNEL_NAME);
	return changesChannel;
}

function notifyChangesUpdated(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent(CHANGES_UPDATED_EVENT));
	getChangesChannel()?.postMessage(null);
}

/** Calls `callback` whenever any tab writes a draft. Returns the unsubscribe. */
export function onChangesUpdated(callback: () => void): () => void {
	if (typeof window === "undefined") return () => {};
	const channel = getChangesChannel();
	window.addEventListener(CHANGES_UPDATED_EVENT, callback);
	channel?.addEventListener("message", callback);
	return () => {
		window.removeEventListener(CHANGES_UPDATED_EVENT, callback);
		channel?.removeEventListener("message", callback);
	};
}

/**
 * A copy of every row this session has read or written. IndexedDB is async, so without it a
 * revisited editor renders empty for a frame and then remounts its fields with the draft.
 * IndexedDB stays the source of truth: callers peek here, then reconcile with a real read.
 */
const memoryRows = new Map<string, PageEditorCachedDocument>();
/** Set once every row was read, so the mirror can stand in for `loadAll...` too. */
let memoryHasAllRows = false;

function rememberRow(document: PageEditorCachedDocument): void {
	memoryRows.set(document.pageId, structuredClone(document));
}

function withBaseline(document: PageEditorCachedDocument): PageEditorCachedDocument {
	// Defensive backfill for rows written before the baseline field existed.
	if (document.baselineValuesByInstance === undefined) {
		document.baselineValuesByInstance = document.valuesByInstance;
	}
	return document;
}

/** The row as of the last read or write in this session, or null when none happened yet. */
export function peekPageEditorDocument(pageId: string): PageEditorCachedDocument | null {
	const row = memoryRows.get(pageId);
	return row ? structuredClone(row) : null;
}

/** Every row, when they have all been read this session; null otherwise. */
export function peekAllPageEditorDocuments(): PageEditorCachedDocument[] | null {
	if (!memoryHasAllRows) return null;
	return Array.from(memoryRows.values(), (row) => structuredClone(row));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function canUseIndexedDb(): boolean {
	return typeof indexedDB !== "undefined";
}

function openPageEditorDb(): Promise<IDBDatabase> {
	if (!canUseIndexedDb()) return Promise.reject(new Error("IndexedDB is not available in this environment."));
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(PAGE_EDITOR_DB_NAME, PAGE_EDITOR_DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = request.result;
			if (!db.objectStoreNames.contains(PAGE_EDITOR_STORE_NAME)) {
				db.createObjectStore(PAGE_EDITOR_STORE_NAME, { keyPath: "pageId" });
				return;
			}

			// v1 -> v2: backfill the committed baseline for existing rows so the
			// changes diff has an "old" side (baseline === current === no changes yet).
			if (event.oldVersion < 2 && request.transaction) {
				const store = request.transaction.objectStore(PAGE_EDITOR_STORE_NAME);
				const cursorRequest = store.openCursor();
				cursorRequest.onsuccess = () => {
					const cursor = cursorRequest.result;
					if (!cursor) return;
					const value = cursor.value as Partial<PageEditorCachedDocument> | undefined;
					if (value && value.baselineValuesByInstance === undefined) {
						value.baselineValuesByInstance = value.valuesByInstance ?? {};
						cursor.update(value);
					}
					cursor.continue();
				};
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
	});

	return dbPromise;
}

function readPageEditorCache(pageId: string): Promise<PageEditorCachedDocument | null> {
	return openPageEditorDb().then(
		(db) =>
			new Promise((resolve, reject) => {
				const transaction = db.transaction(PAGE_EDITOR_STORE_NAME, "readonly");
				const store = transaction.objectStore(PAGE_EDITOR_STORE_NAME);
				const request = store.get(pageId);

				request.onsuccess = () => {
					resolve((request.result as PageEditorCachedDocument | undefined) ?? null);
				};
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to read from IndexedDB."));
			})
	);
}

function readAllPageEditorCache(): Promise<PageEditorCachedDocument[]> {
	return openPageEditorDb().then(
		(db) =>
			new Promise((resolve, reject) => {
				const transaction = db.transaction(PAGE_EDITOR_STORE_NAME, "readonly");
				const store = transaction.objectStore(PAGE_EDITOR_STORE_NAME);
				const request = store.getAll();

				request.onsuccess = () => {
					resolve((request.result as PageEditorCachedDocument[] | undefined) ?? []);
				};
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to read from IndexedDB."));
			})
	);
}

function writePageEditorCache(document: PageEditorCachedDocument): Promise<void> {
	return openPageEditorDb().then(
		(db) =>
			new Promise((resolve, reject) => {
				const transaction = db.transaction(PAGE_EDITOR_STORE_NAME, "readwrite");
				const store = transaction.objectStore(PAGE_EDITOR_STORE_NAME);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () =>
					reject(transaction.error ?? new Error("Failed to write to IndexedDB."));

				store.put(document);
			})
	);
}

function normalizeValuesForCache(
	valuesByInstance: PageEditorValuesByInstance
): PageEditorValuesByInstance {
	const serialized = serializePageEditorValues(valuesByInstance);
	const jsonSafeSerialized = JSON.parse(JSON.stringify(serialized));
	return deserializePageEditorValues(jsonSafeSerialized);
}

/** Whether the remote document was committed after the one a cached draft is based on. */
export function isRemoteTimestampNewer(remoteUpdatedAt: string | null, cacheUpdatedAt: string | null): boolean {
	if (!remoteUpdatedAt) return false;
	if (!cacheUpdatedAt) return true;
	const remoteMs = Date.parse(remoteUpdatedAt);
	const cacheMs = Date.parse(cacheUpdatedAt);
	if (Number.isNaN(remoteMs) || Number.isNaN(cacheMs)) return remoteUpdatedAt !== cacheUpdatedAt;
	return remoteMs > cacheMs;
}

export async function loadPageEditorDocumentFromCache(
	pageId: string
): Promise<PageEditorCachedDocument | null> {
	try {
		const document = await readPageEditorCache(pageId);
		if (!document) {
			memoryRows.delete(pageId);
			return null;
		}
		rememberRow(withBaseline(document));
		return document;
	} catch {
		return null;
	}
}

export async function loadAllPageEditorCacheDocuments(): Promise<PageEditorCachedDocument[]> {
	try {
		const documents = (await readAllPageEditorCache()).map(withBaseline);
		memoryRows.clear();
		for (const document of documents) rememberRow(document);
		memoryHasAllRows = true;
		return documents;
	} catch {
		return [];
	}
}

export async function savePageEditorDocumentToCache(input: {
	pageId: string;
	valuesByInstance: PageEditorValuesByInstance;
	/**
	 * The remote `pages.updated_at` this row is based on. When omitted the stored
	 * value is preserved: an autosaved draft still descends from the same remote
	 * revision, and claiming otherwise makes the next load treat the remote as
	 * newer and overwrite the draft.
	 */
	updatedAt?: string | null;
	/**
	 * When provided, sets the committed baseline (use on remote load and after a
	 * successful commit). When omitted, the existing baseline is preserved so
	 * autosaved drafts keep drifting from the last committed snapshot.
	 */
	baselineValuesByInstance?: PageEditorValuesByInstance;
}): Promise<void> {
	const needsExisting =
		input.baselineValuesByInstance === undefined || input.updatedAt === undefined;
	const existing = needsExisting ? await loadPageEditorDocumentFromCache(input.pageId) : null;

	const baseline =
		input.baselineValuesByInstance ??
		existing?.baselineValuesByInstance ??
		input.valuesByInstance;
	const updatedAt = input.updatedAt === undefined ? (existing?.updatedAt ?? null) : input.updatedAt;

	const document: PageEditorCachedDocument = {
		pageId: input.pageId,
		valuesByInstance: normalizeValuesForCache(input.valuesByInstance),
		baselineValuesByInstance: normalizeValuesForCache(baseline),
		updatedAt,
		cachedAt: new Date().toISOString()
	};

	try {
		await writePageEditorCache(document);
		rememberRow(document);
	} catch {
		// Best effort cache writes should never break editing.
		return;
	}
	notifyChangesUpdated();
}
