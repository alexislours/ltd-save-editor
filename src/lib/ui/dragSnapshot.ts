export type DragSnapshot = {
  files: File[];
  entries: FileSystemEntry[];
};

export function snapshotDataTransfer(dt: DataTransfer): DragSnapshot {
  const files = dt.files ? Array.from(dt.files) : [];
  const entries: FileSystemEntry[] = [];
  const items = dt.items;
  if (items && items.length > 0) {
    for (const item of Array.from(items)) {
      if (item.kind !== 'file') continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
  }
  return { files, entries };
}
