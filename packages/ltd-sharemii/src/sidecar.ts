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

export function normalizeName(name: string): string {
  const idx = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  return idx >= 0 ? name.slice(idx + 1) : name;
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
