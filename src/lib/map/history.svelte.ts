import { SvelteMap } from 'svelte/reactivity';
import { commitTileChanges, getTileByIndex, setTileIndex } from './mapEditor.svelte';

export type TileChange = {
  index: number;
  oldValue: number;
  newValue: number;
};

export type MapAction = {
  name: string;
  changes: TileChange[];
};

const state = $state<{
  undoStack: MapAction[];
  redoStack: MapAction[];
}>({
  undoStack: [],
  redoStack: [],
});

export const historyState = state;

export function canUndo(): boolean {
  return state.undoStack.length > 0;
}

export function canRedo(): boolean {
  return state.redoStack.length > 0;
}

export function pushAction(action: MapAction): void {
  if (action.changes.length === 0) return;
  state.undoStack.push(action);
  state.redoStack = [];
}

export function undo(): void {
  const action = state.undoStack.pop();
  if (!action) return;
  let n = 0;
  for (const c of action.changes) {
    if (setTileIndex(c.index, c.oldValue)) n++;
  }
  commitTileChanges(n);
  state.redoStack.push(action);
}

export function redo(): void {
  const action = state.redoStack.pop();
  if (!action) return;
  let n = 0;
  for (const c of action.changes) {
    if (setTileIndex(c.index, c.newValue)) n++;
  }
  commitTileChanges(n);
  state.undoStack.push(action);
}

export function clearHistory(): void {
  state.undoStack = [];
  state.redoStack = [];
}

export class StrokeBuilder {
  readonly name: string;
  private readonly firstOld = new SvelteMap<number, number>();
  private readonly latestNew = new SvelteMap<number, number>();

  constructor(name: string) {
    this.name = name;
  }

  apply(index: number, newValue: number): boolean {
    newValue = newValue >>> 0;
    if (!this.firstOld.has(index)) {
      this.firstOld.set(index, getTileByIndex(index));
    }
    const changed = setTileIndex(index, newValue);
    this.latestNew.set(index, newValue);
    return changed;
  }

  changeCount(): number {
    let n = 0;
    for (const [index, newValue] of this.latestNew) {
      if (this.firstOld.get(index) !== newValue) n++;
    }
    return n;
  }

  build(): MapAction | null {
    const changes: TileChange[] = [];
    for (const [index, newValue] of this.latestNew) {
      const oldValue = this.firstOld.get(index)!;
      if (oldValue === newValue) continue;
      changes.push({ index, oldValue, newValue });
    }
    if (changes.length === 0) return null;
    changes.sort((a, b) => a.index - b.index);
    return { name: this.name, changes };
  }
}
