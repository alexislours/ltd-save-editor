import {
  commitTileChanges,
  getTileByIndex,
  getUgcByIndex,
  setTileIndex,
  setUgcIndex,
} from './mapEditor.svelte';
import {
  bumpObjectsRev,
  restoreObject,
  type ObjectChange,
  type ObjectSnapshot,
} from './mapObjectsEditor.svelte';

export type TileChange = {
  index: number;
  oldValue: number;
  newValue: number;
  oldUgc?: number;
  newUgc?: number;
};

type TileMapAction = {
  kind: 'tile';
  changes: TileChange[];
};

export type ObjectMapAction = {
  kind: 'object';
  changes: ObjectChange[];
};

type AtomicMapAction = TileMapAction | ObjectMapAction;

type CompoundMapAction = {
  kind: 'compound';
  actions: AtomicMapAction[];
};

type MapAction = AtomicMapAction | CompoundMapAction;

export type { ObjectChange };

const state = $state<{
  undoStack: MapAction[];
  redoStack: MapAction[];
}>({
  undoStack: [],
  redoStack: [],
});

export function canUndo(): boolean {
  return state.undoStack.length > 0;
}

export function canRedo(): boolean {
  return state.redoStack.length > 0;
}

export function pushAction(action: MapAction): void {
  if (action.kind === 'compound') {
    const nonEmpty = action.actions.filter((a) => a.changes.length > 0);
    if (nonEmpty.length === 0) return;
    if (nonEmpty.length !== action.actions.length) {
      action = { kind: 'compound', actions: nonEmpty };
    }
  } else if (action.changes.length === 0) {
    return;
  }
  state.undoStack.push(action);
  state.redoStack = [];
}

function applyTile(
  changes: TileChange[],
  pick: (c: TileChange) => number,
  pickUgc: (c: TileChange) => number | undefined,
): void {
  let n = 0;
  for (const c of changes) {
    if (setTileIndex(c.index, pick(c))) n++;
    const u = pickUgc(c);
    if (u !== undefined) {
      if (setUgcIndex(c.index, u)) n++;
    }
  }
  commitTileChanges(n);
}

function applyObject(changes: ObjectChange[], pick: (c: ObjectChange) => ObjectSnapshot): void {
  let any = false;
  for (const c of changes) {
    if (restoreObject(c.index, pick(c))) any = true;
  }
  if (any) bumpObjectsRev();
}

function revertAtomic(action: AtomicMapAction): void {
  if (action.kind === 'tile') {
    applyTile(
      action.changes,
      (c) => c.oldValue,
      (c) => c.oldUgc,
    );
  } else {
    applyObject(action.changes, (c) => c.before);
  }
}

function reapplyAtomic(action: AtomicMapAction): void {
  if (action.kind === 'tile') {
    applyTile(
      action.changes,
      (c) => c.newValue,
      (c) => c.newUgc,
    );
  } else {
    applyObject(action.changes, (c) => c.after);
  }
}

export function undo(): void {
  const action = state.undoStack.pop();
  if (!action) return;
  if (action.kind === 'compound') {
    for (let i = action.actions.length - 1; i >= 0; i--) revertAtomic(action.actions[i]);
  } else {
    revertAtomic(action);
  }
  state.redoStack.push(action);
}

export function redo(): void {
  const action = state.redoStack.pop();
  if (!action) return;
  if (action.kind === 'compound') {
    for (const sub of action.actions) reapplyAtomic(sub);
  } else {
    reapplyAtomic(action);
  }
  state.undoStack.push(action);
}

export class StrokeBuilder {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  private readonly firstOld = new Map<number, number>();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  private readonly latestNew = new Map<number, number>();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  private readonly firstOldUgc = new Map<number, number>();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  private readonly latestNewUgc = new Map<number, number>();

  apply(index: number, newValue: number, newUgc?: number): boolean {
    newValue = newValue >>> 0;
    if (!this.firstOld.has(index)) {
      this.firstOld.set(index, getTileByIndex(index));
    }
    const tileChanged = setTileIndex(index, newValue);
    this.latestNew.set(index, newValue);
    let ugcChanged = false;
    if (newUgc !== undefined) {
      const u = newUgc | 0;
      if (!this.firstOldUgc.has(index)) {
        this.firstOldUgc.set(index, getUgcByIndex(index));
      }
      ugcChanged = setUgcIndex(index, u);
      this.latestNewUgc.set(index, u);
    }
    return tileChanged || ugcChanged;
  }

  changeCount(): number {
    let n = 0;
    for (const [index, newValue] of this.latestNew) {
      if (this.firstOld.get(index) !== newValue) n++;
    }
    for (const [index, newUgc] of this.latestNewUgc) {
      if (this.firstOldUgc.get(index) !== newUgc) n++;
    }
    return n;
  }

  build(): TileMapAction | null {
    const changes: TileChange[] = [];
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const allIndices = new Set<number>();
    for (const i of this.latestNew.keys()) allIndices.add(i);
    for (const i of this.latestNewUgc.keys()) allIndices.add(i);

    for (const index of allIndices) {
      const oldValue = this.firstOld.get(index) ?? getTileByIndex(index);
      const newValue = this.latestNew.get(index) ?? oldValue;
      const tileChanged = oldValue !== newValue;

      const hasUgc = this.latestNewUgc.has(index);
      const oldUgc = hasUgc ? this.firstOldUgc.get(index)! : undefined;
      const newUgc = hasUgc ? this.latestNewUgc.get(index)! : undefined;
      const ugcChanged = hasUgc && oldUgc !== newUgc;

      if (!tileChanged && !ugcChanged) continue;
      const change: TileChange = { index, oldValue, newValue };
      if (ugcChanged) {
        change.oldUgc = oldUgc;
        change.newUgc = newUgc;
      }
      changes.push(change);
    }
    if (changes.length === 0) return null;
    changes.sort((a, b) => a.index - b.index);
    return { kind: 'tile', changes };
  }
}
