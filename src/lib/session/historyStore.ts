import type { SaveKind } from '$lib/saveFile/saveFile.svelte';

const DB_NAME = 'ltd-save-editor-history';
const META_STORE = 'snapshots';
const FILES_STORE = 'snapshotFiles';
const VERSION = 2;

export const HISTORY_MAX_SNAPSHOTS = 25;

export type HistorySaveFile = {
  kind: SaveKind;
  name: string;
  bytes: Uint8Array;
};

export type HistoryUgcFile = {
  name: string;
  bytes: Uint8Array;
};

export type HistorySnapshotMeta = {
  id: string;
  savedAt: number;
  totalBytes: number;
  saveFiles: { kind: SaveKind; name: string; bytes: number }[];
  ugcFiles: { name: string; bytes: number }[];
  playerName: string | null;
  islandName: string | null;
  miiCount: number | null;
  contentHash: number;
};

type HistorySnapshotFiles = {
  id: string;
  saves: HistorySaveFile[];
  ugc: HistoryUgcFile[];
};

type SaveResult =
  | { ok: true; snapshot: HistorySnapshotMeta }
  | { ok: false; reason: 'quota' | 'duplicate' | 'unavailable' | 'error' };

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
      if (db.objectStoreNames.contains(META_STORE)) db.deleteObjectStore(META_STORE);
      if (db.objectStoreNames.contains(FILES_STORE)) db.deleteObjectStore(FILES_STORE);
      const meta = db.createObjectStore(META_STORE, { keyPath: 'id' });
      meta.createIndex('savedAt', 'savedAt');
      db.createObjectStore(FILES_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

export async function listSnapshotMeta(): Promise<HistorySnapshotMeta[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    let t: IDBTransaction;
    try {
      t = db.transaction(META_STORE, 'readonly');
    } catch {
      resolve([]);
      return;
    }
    const store = t.objectStore(META_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const out = (req.result ?? []) as HistorySnapshotMeta[];
      out.sort((a, b) => b.savedAt - a.savedAt);
      resolve(out);
    };
    req.onerror = () => resolve([]);
    t.onerror = () => resolve([]);
    t.onabort = () => resolve([]);
  });
}

export async function getSnapshotFiles(id: string): Promise<HistorySnapshotFiles | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    let t: IDBTransaction;
    try {
      t = db.transaction(FILES_STORE, 'readonly');
    } catch {
      resolve(null);
      return;
    }
    const req = t.objectStore(FILES_STORE).get(id);
    req.onsuccess = () => resolve((req.result as HistorySnapshotFiles | undefined) ?? null);
    req.onerror = () => resolve(null);
    t.onerror = () => resolve(null);
    t.onabort = () => resolve(null);
  });
}

export async function deleteSnapshot(id: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    let t: IDBTransaction;
    try {
      t = db.transaction([META_STORE, FILES_STORE], 'readwrite');
    } catch {
      resolve(false);
      return;
    }
    t.objectStore(META_STORE).delete(id);
    t.objectStore(FILES_STORE).delete(id);
    t.oncomplete = () => resolve(true);
    t.onerror = () => resolve(false);
    t.onabort = () => resolve(false);
  });
}

export async function clearHistory(): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    let t: IDBTransaction;
    try {
      t = db.transaction([META_STORE, FILES_STORE], 'readwrite');
    } catch {
      resolve(false);
      return;
    }
    t.objectStore(META_STORE).clear();
    t.objectStore(FILES_STORE).clear();
    t.oncomplete = () => resolve(true);
    t.onerror = () => resolve(false);
    t.onabort = () => resolve(false);
  });
}

function newSnapshotId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type SnapshotInput = {
  saves: HistorySaveFile[];
  ugc: HistoryUgcFile[];
  contentHash: number;
  playerName: string | null;
  islandName: string | null;
  miiCount: number | null;
};

export async function saveSnapshot(input: SnapshotInput): Promise<SaveResult> {
  if (input.saves.length === 0 && input.ugc.length === 0) {
    return { ok: false, reason: 'error' };
  }
  const db = await openDb();
  if (!db) return { ok: false, reason: 'unavailable' };

  const totalBytes =
    input.saves.reduce((s, f) => s + f.bytes.byteLength, 0) +
    input.ugc.reduce((s, f) => s + f.bytes.byteLength, 0);

  const meta: HistorySnapshotMeta = {
    id: newSnapshotId(),
    savedAt: Date.now(),
    totalBytes,
    saveFiles: input.saves.map((f) => ({ kind: f.kind, name: f.name, bytes: f.bytes.byteLength })),
    ugcFiles: input.ugc.map((f) => ({ name: f.name, bytes: f.bytes.byteLength })),
    playerName: input.playerName,
    islandName: input.islandName,
    miiCount: input.miiCount,
    contentHash: input.contentHash,
  };
  const files: HistorySnapshotFiles = { id: meta.id, saves: input.saves, ugc: input.ugc };

  return new Promise<SaveResult>((resolve) => {
    let t: IDBTransaction;
    try {
      t = db.transaction([META_STORE, FILES_STORE], 'readwrite');
    } catch {
      resolve({ ok: false, reason: 'error' });
      return;
    }
    const metaStore = t.objectStore(META_STORE);
    const filesStore = t.objectStore(FILES_STORE);
    const idx = metaStore.index('savedAt');

    let result: SaveResult = { ok: false, reason: 'error' };
    const ascending: HistorySnapshotMeta[] = [];
    const cursorReq = idx.openCursor(null, 'next');
    cursorReq.onsuccess = () => {
      const cur = cursorReq.result;
      if (cur) {
        ascending.push(cur.value as HistorySnapshotMeta);
        cur.continue();
        return;
      }
      const latest = ascending[ascending.length - 1];
      if (latest && latest.contentHash === input.contentHash) {
        result = { ok: false, reason: 'duplicate' };
        t.abort();
        return;
      }
      const overflow = ascending.length + 1 - HISTORY_MAX_SNAPSHOTS;
      for (let i = 0; i < overflow; i++) {
        metaStore.delete(ascending[i].id);
        filesStore.delete(ascending[i].id);
      }
      metaStore.put(meta);
      filesStore.put(files);
      result = { ok: true, snapshot: meta };
    };

    t.oncomplete = () => resolve(result);
    t.onerror = () => {
      const name = t.error?.name;
      if (name === 'QuotaExceededError') resolve({ ok: false, reason: 'quota' });
      else if (result.ok === false && result.reason === 'duplicate') resolve(result);
      else resolve({ ok: false, reason: 'error' });
    };
    t.onabort = () => {
      if (result.ok === false && result.reason === 'duplicate') resolve(result);
      else if (t.error?.name === 'QuotaExceededError') resolve({ ok: false, reason: 'quota' });
      else resolve(result);
    };
  });
}
