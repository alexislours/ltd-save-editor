/**
 * A single named texture blob that travels alongside a share file, keyed by its
 * in-save file name (for example `UgcFood000.canvas.zs`).
 */
export type SidecarFile = {
  /** In-save file name, used as the lookup key inside a {@link SidecarSource}. */
  name: string;
  /** Raw, still-compressed file contents. */
  bytes: Uint8Array;
};

/**
 * A pool of texture files accompanying a save, indexed by file name. `origin`
 * records where it came from so writes can be skipped when there is nowhere to
 * persist them (`'none'`).
 */
export type SidecarSource = {
  /** Where the files were loaded from; `'none'` means there is no backing store to write to. */
  origin: 'none' | 'folder' | 'zip';
  /** File name to raw bytes. Mutated in place when applying a share file with a writable origin. */
  files: Map<string, Uint8Array>;
};

/** A shared, empty {@link SidecarSource} (`origin: 'none'`) used as the default when no textures are supplied. */
export const EMPTY_SIDECAR: SidecarSource = {
  origin: 'none',
  files: new Map(),
};

/** Strip any directory prefix from `name`, returning just the final path segment (handles both `/` and `\` separators). */
export function normalizeName(name: string): string {
  const idx = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  return idx >= 0 ? name.slice(idx + 1) : name;
}

/** Whether `name` is a recognized sidecar texture file (a `.canvas.zs` or `.ugctex.zs` blob), case-insensitively. */
export function isSidecarFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.canvas.zs') || lower.endsWith('.ugctex.zs');
}

/**
 * Whether an archive entry should be ignored when ingesting a folder or zip:
 * directory entries, `__MACOSX` cruft, dotfiles, and empty paths all count as junk.
 */
export function isJunkArchiveEntry(path: string): boolean {
  if (!path) return true;
  if (path.endsWith('/') || path.endsWith('\\')) return true;
  if (path.includes('__MACOSX/') || path.includes('__MACOSX\\')) return true;
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const base = idx >= 0 ? path.slice(idx + 1) : path;
  if (!base || base.startsWith('.')) return true;
  return false;
}
