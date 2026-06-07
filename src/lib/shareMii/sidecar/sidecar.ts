import { unzipSync, zipSync } from 'fflate';
import {
  ShareMiiError,
  isJunkArchiveEntry,
  isSidecarFileName,
  normalizeName,
  type SidecarFile,
  type SidecarSource,
} from '@alexislours/ltd-sharemii';

export {
  isJunkArchiveEntry,
  isSidecarFileName,
  type SidecarFile,
  type SidecarSource,
} from '@alexislours/ltd-sharemii';

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

export function buildSidecarZip(files: SidecarFile[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    entries[f.name] = f.bytes;
  }
  return zipSync(entries, { level: 0 });
}
