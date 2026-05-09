import { SvelteSet } from 'svelte/reactivity';

type SelectionState = {
  indices: SvelteSet<number>;
  rev: number;
};

export const selection = $state<SelectionState>({
  indices: new SvelteSet<number>(),
  rev: 0,
});

function bump(): void {
  selection.rev = (selection.rev + 1) | 0;
}

export function set(indices: Iterable<number>): void {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const next = indices instanceof Set ? indices : new Set(indices);
  const cur = selection.indices;
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

export function clear(): void {
  if (selection.indices.size === 0) return;
  selection.indices.clear();
  bump();
}

export function toggle(index: number): void {
  if (selection.indices.has(index)) selection.indices.delete(index);
  else selection.indices.add(index);
  bump();
}
