/**
 * Minimal promise wrapper around one IndexedDB object store with out-of-line keys.
 * Every call fails soft (null / [] / false) so a browser without IndexedDB (private
 * mode, tests) keeps working, just without persistence.
 */
export type IdbStore<T> = {
	get(key: string): Promise<T | null>;
	getAll(): Promise<T[]>;
	put(key: string, value: T): Promise<boolean>;
	delete(key: string): Promise<boolean>;
};

export function createIdbStore<T>(databaseName: string, storeName: string): IdbStore<T> {
	let dbPromise: Promise<IDBDatabase> | null = null;

	function open(): Promise<IDBDatabase> {
		if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB is not available."));
		dbPromise ??= new Promise((resolve, reject) => {
			const request = indexedDB.open(databaseName, 1);
			request.onupgradeneeded = () => {
				if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => {
				dbPromise = null;
				reject(request.error ?? new Error("Failed to open IndexedDB."));
			};
		});
		return dbPromise;
	}

	function run<R>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<R> {
		return open().then(
			(db) =>
				new Promise<R>((resolve, reject) => {
					const transaction = db.transaction(storeName, mode);
					const request = action(transaction.objectStore(storeName));
					transaction.oncomplete = () => resolve(request.result as R);
					transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB request failed."));
				})
		);
	}

	return {
		get: (key) => run<T | undefined>("readonly", (store) => store.get(key)).then((value) => value ?? null, () => null),
		getAll: () => run<T[]>("readonly", (store) => store.getAll()).catch(() => []),
		put: (key, value) => run("readwrite", (store) => store.put(value, key)).then(() => true, () => false),
		delete: (key) => run("readwrite", (store) => store.delete(key)).then(() => true, () => false)
	};
}
