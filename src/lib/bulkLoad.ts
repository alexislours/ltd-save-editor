import { unzipSync, type Unzipped } from 'fflate';
import {
  detectSaveKindFromBytes,
  detectSaveKindFromName,
  getSave,
  SAVE_KINDS,
  setSaveFromBytes,
  type SaveKind,
} from './saveFile.svelte';
import { isJunkArchiveEntry, isSidecarFileName } from './shareMii/sidecar';
import { collectSidecarFromNamedBytes } from './shareMii/sidecarStore.svelte';

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

type ZipExpansion = { savs: Candidate[]; sidecars: { name: string; bytes: Uint8Array }[] };

async function expandZip(file: File): Promise<ZipExpansion> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let entries: Unzipped;
  try {
    entries = unzipSync(buf, {
      filter: (e) =>
        !isJunkArchiveEntry(e.name) && (SAV_EXT.test(e.name) || isSidecarFileName(e.name)),
    });
  } catch {
    return { savs: [], sidecars: [] };
  }
  const savs: Candidate[] = [];
  const sidecars: { name: string; bytes: Uint8Array }[] = [];
  for (const [path, bytes] of Object.entries(entries)) {
    if (isJunkArchiveEntry(path)) continue;
    const name = path.split('/').pop() ?? path;
    if (!name) continue;
    if (SAV_EXT.test(name)) {
      savs.push({ name, bytes, lastModified: file.lastModified, fromZip: true });
    } else if (isSidecarFileName(name)) {
      sidecars.push({ name, bytes });
    }
  }
  return { savs, sidecars };
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
  const sidecarBatches: { name: string; bytes: Uint8Array }[][] = [];
  const folderSidecars: { name: string; bytes: Uint8Array }[] = [];

  for (const file of files) {
    if (ZIP_EXT.test(file.name)) {
      const expanded = await expandZip(file);
      if (expanded.savs.length === 0 && expanded.sidecars.length === 0) {
        skipped.push({ name: file.name, reason: 'read_failed' });
        continue;
      }
      candidates.push(...expanded.savs);
      if (expanded.sidecars.length > 0) sidecarBatches.push(expanded.sidecars);
      continue;
    }
    if (isSidecarFileName(file.name)) {
      const fullPath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      if (isJunkArchiveEntry(fullPath)) continue;
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        folderSidecars.push({ name: file.name, bytes });
      } catch {
        skipped.push({ name: file.name, reason: 'read_failed' });
      }
      continue;
    }
    try {
      candidates.push(await fileToCandidate(file));
    } catch {
      skipped.push({ name: file.name, reason: 'read_failed' });
    }
  }

  if (folderSidecars.length > 0) sidecarBatches.push(folderSidecars);
  for (const batch of sidecarBatches) collectSidecarFromNamedBytes('bulk', batch);

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

export function planFromZip(plan: BulkPlan): boolean {
  for (const c of plan.matches.values()) if (c.fromZip) return true;
  return false;
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
