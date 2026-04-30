import { unzipSync, zipSync } from 'fflate';
import { ShareMiiError } from './errors';

export type SidecarFile = {
  name: string;
  bytes: Uint8Array;
};

export type SidecarSource = {
  origin: 'none' | 'folder' | 'zip';
  files: Map<string, Uint8Array>;
};

export const EMPTY_SIDECAR: SidecarSource = {
  origin: 'none',
  files: new Map(),
};

function normalizeName(name: string): string {
  const idx = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  return idx >= 0 ? name.slice(idx + 1) : name;
}

export function getSidecar(source: SidecarSource, fileName: string): Uint8Array | null {
  return source.files.get(fileName) ?? null;
}

export function hasSidecar(source: SidecarSource, fileName: string): boolean {
  return source.files.has(fileName);
}

export async function sidecarFromFolderFiles(files: File[]): Promise<SidecarSource> {
  const out = new Map<string, Uint8Array>();
  for (const file of files) {
    const fullPath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    if (isJunkArchiveEntry(fullPath)) continue;
    if (!isSidecarFileName(file.name)) continue;
    const buf = new Uint8Array(await file.arrayBuffer());
    out.set(normalizeName(file.name), buf);
  }
  return { origin: 'folder', files: out };
}

export async function sidecarFromZipFile(file: File): Promise<SidecarSource> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let entries;
  try {
    entries = unzipSync(buf);
  } catch {
    throw new ShareMiiError('invalid_zip');
  }
  const out = new Map<string, Uint8Array>();
  for (const [name, bytes] of Object.entries(entries)) {
    if (isJunkArchiveEntry(name)) continue;
    const base = normalizeName(name);
    if (!isSidecarFileName(base)) continue;
    out.set(base, bytes as Uint8Array);
  }
  return { origin: 'zip', files: out };
}

export function isSidecarFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.canvas.zs') || lower.endsWith('.ugctex.zs');
}

export function isJunkArchiveEntry(path: string): boolean {
  if (!path) return true;
  if (path.endsWith('/') || path.endsWith('\\')) return true;
  if (path.includes('__MACOSX/') || path.includes('__MACOSX\\')) return true;
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const base = idx >= 0 ? path.slice(idx + 1) : path;
  if (!base || base.startsWith('.')) return true;
  return false;
}

export function buildSidecarZip(files: SidecarFile[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    entries[f.name] = f.bytes;
  }
  return zipSync(entries, { level: 0 });
}
