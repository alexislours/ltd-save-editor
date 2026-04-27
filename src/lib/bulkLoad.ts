import { unzipSync, type Unzipped } from 'fflate';
import {
  detectSaveKindFromBytes,
  detectSaveKindFromName,
  getSave,
  SAVE_KINDS,
  setSaveFromBytes,
  type SaveKind,
} from './saveFile.svelte';

export type Candidate = {
  name: string;
  bytes: Uint8Array;
  lastModified: number;
  fromZip: boolean;
};

export type BulkPlan = {
  matches: Map<SaveKind, Candidate>;
  conflicts: SaveKind[];
  skipped: { name: string; reason: 'unrecognized' | 'read_failed' }[];
  totalSeen: number;
};

const ZIP_EXT = /\.zip$/i;
const SAV_EXT = /\.sav$/i;

async function expandZip(file: File): Promise<Candidate[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let entries: Unzipped;
  try {
    entries = unzipSync(buf, {
      filter: (e) => SAV_EXT.test(e.name) && !e.name.endsWith('/'),
    });
  } catch {
    return [];
  }
  const out: Candidate[] = [];
  for (const [path, bytes] of Object.entries(entries)) {
    const name = path.split('/').pop() ?? path;
    if (!name) continue;
    out.push({
      name,
      bytes,
      lastModified: file.lastModified,
      fromZip: true,
    });
  }
  return out;
}

async function fileToCandidate(file: File): Promise<Candidate> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { name: file.name, bytes, lastModified: file.lastModified, fromZip: false };
}

/** Detect kind, preferring filename match (cheap), falling back to bytes parse. */
function detectKind(c: Candidate): SaveKind | null {
  return detectSaveKindFromName(c.name) ?? detectSaveKindFromBytes(c.bytes);
}

export async function planBulkLoad(files: File[]): Promise<BulkPlan> {
  const skipped: BulkPlan['skipped'] = [];
  const candidates: Candidate[] = [];

  for (const file of files) {
    if (ZIP_EXT.test(file.name)) {
      const expanded = await expandZip(file);
      if (expanded.length === 0) {
        skipped.push({ name: file.name, reason: 'read_failed' });
        continue;
      }
      candidates.push(...expanded);
      continue;
    }
    try {
      candidates.push(await fileToCandidate(file));
    } catch {
      skipped.push({ name: file.name, reason: 'read_failed' });
    }
  }

  const matches = new Map<SaveKind, Candidate>();
  for (const c of candidates) {
    const kind = detectKind(c);
    if (kind === null) {
      skipped.push({ name: c.name, reason: 'unrecognized' });
      continue;
    }
    matches.set(kind, c);
  }

  const conflicts = SAVE_KINDS.filter((k) => matches.has(k) && getSave(k) != null);

  return { matches, conflicts, skipped, totalSeen: candidates.length };
}

export function applyBulkPlan(plan: BulkPlan): SaveKind[] {
  const loaded: SaveKind[] = [];
  for (const [kind, c] of plan.matches) {
    setSaveFromBytes(kind, { name: c.name, bytes: c.bytes, lastModified: c.lastModified });
    loaded.push(kind);
  }
  return loaded;
}

export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const items = dt.items;
  if (!items || items.length === 0) return Array.from(dt.files);

  const entries: FileSystemEntry[] = [];
  for (const item of Array.from(items)) {
    if (item.kind !== 'file') continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }

  if (entries.length === 0) return Array.from(dt.files);

  const out: File[] = [];
  for (const entry of entries) await walkEntry(entry, out);
  return out;
}

async function walkEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => {
      (entry as FileSystemFileEntry).file(resolve, () => resolve(null));
    });
    if (file) out.push(file);
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries returns batches; loop until empty.
    while (true) {
      const batch = await new Promise<FileSystemEntry[]>((resolve) => {
        reader.readEntries(resolve, () => resolve([]));
      });
      if (batch.length === 0) break;
      for (const child of batch) await walkEntry(child, out);
    }
  }
}
