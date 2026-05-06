import type { SidecarSource } from '$lib/shareMii';

export function parseSidecarIds(sidecar: SidecarSource, prefix: string): number[] {
  const ids = new Set<number>();
  for (const name of sidecar.files.keys()) {
    if (!name.startsWith(prefix)) continue;
    const idxStr = name.slice(prefix.length, prefix.length + 3);
    if (!/^\d{3}$/.test(idxStr)) continue;
    const next = name.charAt(prefix.length + 3);
    if (next !== '.' && next !== '_') continue;
    ids.add(parseInt(idxStr, 10));
  }
  return [...ids].sort((a, b) => a - b);
}
