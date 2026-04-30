import type { SaveKind } from './saveFile.svelte';

const DB_NAME = 'ltd-save-editor';
const STORE = 'sessions';
const SIDECAR_STORE = 'sidecars';
const VERSION = 2;

export type StoredSession = {
  kind: SaveKind;
  name: string;
  bytes: Uint8Array;
  lastModified: number;
  savedAt: number;
};

export type StoredSidecar = {
  name: string;
  bytes: Uint8Array;
  origin: 'folder' | 'zip' | 'bulk';
  savedAt: number;
  pending?: boolean;
  originalBytes?: Uint8Array;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'kind' });
      }
      if (!db.objectStoreNames.contains(SIDECAR_STORE)) {
        db.createObjectStore(SIDECAR_STORE, { keyPath: 'name' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | T,
): Promise<T | null> {
  return openDb().then((db) => {
    if (!db) return null;
    return new Promise<T | null>((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(storeName, mode);
      } catch {
        resolve(null);
        return;
      }
      const store = tx.objectStore(storeName);
      let result: T | null = null;
      const out = run(store);
      if (out && typeof out === 'object' && 'onsuccess' in out) {
        const req = out as IDBRequest<T>;
        req.onsuccess = () => {
          result = req.result;
        };
        req.onerror = () => {
          result = null;
        };
      } else {
        result = (out as T) ?? null;
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    });
  });
}

export async function putSession(record: StoredSession): Promise<void> {
  await withStore(STORE, 'readwrite', (s) => s.put(record));
}

export async function deleteSession(kind: SaveKind): Promise<void> {
  await withStore(STORE, 'readwrite', (s) => s.delete(kind));
}

export async function clearAllSessions(): Promise<void> {
  await withStore(STORE, 'readwrite', (s) => s.clear());
  await clearAllSidecars();
}

export async function getAllSessions(): Promise<StoredSession[]> {
  const out = await withStore<StoredSession[]>(STORE, 'readonly', (s) => s.getAll());
  return out ?? [];
}

export async function putSidecar(record: StoredSidecar): Promise<void> {
  await withStore(SIDECAR_STORE, 'readwrite', (s) => s.put(record));
}

export async function putSidecars(records: StoredSidecar[]): Promise<void> {
  if (records.length === 0) return;
  await withStore<void>(SIDECAR_STORE, 'readwrite', (s) => {
    for (const r of records) s.put(r);
  });
}

export async function deleteSidecar(name: string): Promise<void> {
  await withStore(SIDECAR_STORE, 'readwrite', (s) => s.delete(name));
}

export async function clearAllSidecars(): Promise<void> {
  await withStore(SIDECAR_STORE, 'readwrite', (s) => s.clear());
}

export async function getAllSidecars(): Promise<StoredSidecar[]> {
  const out = await withStore<StoredSidecar[]>(SIDECAR_STORE, 'readonly', (s) => s.getAll());
  return out ?? [];
}
