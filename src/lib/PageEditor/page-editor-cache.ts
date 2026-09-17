import type {
	PageEditorCachedDocument,
	PageEditorValuesByInstance
} from "$lib/PageEditor/persistence";
import {
	deserializePageEditorValues,
	serializePageEditorValues
} from "$lib/PageEditor/persistence";

const PAGE_EDITOR_DB_NAME = "page-editor-cache";
const PAGE_EDITOR_DB_VERSION = 2;
const PAGE_EDITOR_STORE_NAME = "documents";

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

export async function loadPageEditorDocumentFromCache(
	pageId: string
): Promise<PageEditorCachedDocument | null> {
	try {
		const document = await readPageEditorCache(pageId);
		if (document && document.baselineValuesByInstance === undefined) {
			// Defensive backfill for rows written before the baseline field existed.
			document.baselineValuesByInstance = document.valuesByInstance;
		}
		return document;
	} catch {
		return null;
	}
}

export async function loadAllPageEditorCacheDocuments(): Promise<PageEditorCachedDocument[]> {
	try {
		const documents = await readAllPageEditorCache();
		for (const document of documents) {
			if (document.baselineValuesByInstance === undefined) {
				document.baselineValuesByInstance = document.valuesByInstance;
			}
		}
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
	} catch {
		// Best effort cache writes should never break editing.
	}
}
