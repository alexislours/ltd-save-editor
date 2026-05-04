import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';
import { TROUBLE_FIELDS, type TroubleFieldKey } from './troubleFields';

export type SnapshotMap = Partial<Record<TroubleFieldKey, unknown[]>>;

export function captureSnapshot(
  mii: MiiAccessor | null,
  selectedIndex: number | null,
): SnapshotMap {
  const snap: SnapshotMap = {};
  if (!mii || selectedIndex == null) return snap;
  const idx = selectedIndex;
  for (const k of Object.keys(TROUBLE_FIELDS) as TroubleFieldKey[]) {
    const f = TROUBLE_FIELDS[k];
    if (!mii.has(f.leaf)) continue;
    try {
      const arr = mii.get(f.leaf) as unknown[];
      const start = idx * f.perMii;
      snap[k] = arr.slice(start, start + f.perMii);
    } catch {
      /* skip */
    }
  }
  return snap;
}

export function revertTroubleFields(
  mii: MiiAccessor | null,
  selectedIndex: number | null,
  snapshot: SnapshotMap,
): void {
  if (!mii || selectedIndex == null) return;
  for (const k of Object.keys(TROUBLE_FIELDS) as TroubleFieldKey[]) {
    const orig = snapshot[k];
    if (!orig) continue;
    const f = TROUBLE_FIELDS[k];
    if (!mii.has(f.leaf)) continue;
    const start = selectedIndex * f.perMii;
    for (let s = 0; s < f.perMii; s++) {
      try {
        mii.setElement(f.leaf, start + s, orig[s] as never);
      } catch {
        /* skip */
      }
    }
  }
}
