import { SvelteSet } from 'svelte/reactivity';

type TileSelectionState = {
  indices: SvelteSet<number>;
  rev: number;
};

export const tileSelection = $state<TileSelectionState>({
  indices: new SvelteSet<number>(),
  rev: 0,
});

function bump(): void {
  tileSelection.rev = (tileSelection.rev + 1) | 0;
}

export function setTileSelection(indices: Iterable<number>): void {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const next = indices instanceof Set ? indices : new Set(indices);
  const cur = tileSelection.indices;
  if (next.size === cur.size) {
    let same = true;
    for (const i of next) {
      if (!cur.has(i)) {
        same = false;
        break;
      }
    }
    if (same) return;
  }
  let changed = false;
  for (const i of cur) {
    if (!next.has(i)) {
      cur.delete(i);
      changed = true;
    }
  }
  for (const i of next) {
    if (!cur.has(i)) {
      cur.add(i);
      changed = true;
    }
  }
  if (changed) bump();
}

export function clearTileSelection(): void {
  if (tileSelection.indices.size === 0) return;
  tileSelection.indices.clear();
  bump();
}
