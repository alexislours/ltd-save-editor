import { track } from '../analytics';
import {
  getSave,
  getSaveBytes,
  type SaveKind,
  type SchemaForKind,
  expectedFileName,
} from '../saveFile.svelte';
import { schedulePersist } from '../sessionPersist';
import { downloadBytes } from './download';
import { createMaterializedAccessor, type Accessor } from './materialized/accessor';
import { decodeValue } from './materialized/decode';
import { buildHashMap, pathToLeafMap } from './materialized/schemaIndex';
import type { DecodedSave } from './materialized/types';
import type { Entry } from './types';

class EditorState {
  decoded = $state<DecodedSave | null>(null);
  error = $state<string | null>(null);
  loadId = $state<number>(0);
  loadedBytes = $state<Uint8Array | null>(null);
  dirty = $state<boolean>(false);
}

export type SaveEditorState = EditorState;

export type SaveEditor<K extends string> = {
  readonly state: EditorState;
  syncFromSave: () => void;
  commitEntryEdit: (entry: Entry) => void;
  downloadModified: () => void;
  accessor: () => Accessor<K> | null;
};

function cloneEntry(e: Entry): Entry {
  return {
    hash: e.hash,
    type: e.type,
    inlineRaw: e.inlineRaw,
    payload: e.payload?.slice() ?? null,
  };
}

export function createSaveEditor<K extends SaveKind>(
  kind: K,
  schema: SchemaForKind[K],
): SaveEditor<K> {
  const state = new EditorState();
  let seenLoadId = -1;
  const cache = {
    accessor: null as Accessor<K> | null,
    decoded: null as DecodedSave | null,
    planIndex: null as Map<number, number> | null,
  };

  function resetCaches(): void {
    cache.accessor = null;
    cache.decoded = null;
    cache.planIndex = null;
  }

  function clear(): void {
    state.decoded = null;
    state.error = null;
    state.loadId = 0;
    state.loadedBytes = null;
    state.dirty = false;
    seenLoadId = -1;
    resetCaches();
  }

  function syncFromSave(): void {
    const save = getSave(kind);
    if (!save) {
      if (state.decoded || state.error || state.loadedBytes) clear();
      return;
    }
    const decoded = save.decoded;
    if (
      save.loadId === seenLoadId &&
      state.decoded === decoded &&
      state.error === save.parseError &&
      state.loadedBytes === save.loadedBytes
    ) {
      return;
    }
    state.decoded = decoded;
    state.error = save.parseError;
    state.loadId = save.loadId;
    state.loadedBytes = save.loadedBytes;
    state.dirty = false;
    seenLoadId = save.loadId;
    resetCaches();
    if (save.parseError) track('parse_failed', { kind });
  }

  function planIndexFor(decoded: DecodedSave): Map<number, number> {
    if (cache.planIndex && cache.decoded === decoded) return cache.planIndex;
    const plan = decoded.plan;
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const map = new Map<number, number>();
    const pathMap = pathToLeafMap(schema);
    for (let i = 0; i < plan.length; i++) {
      const item = plan[i];
      if (item.kind === 'known') {
        const leaf = pathMap.get(item.path);
        if (leaf) map.set(leaf.hash >>> 0, i);
      } else {
        const u = decoded.unknowns[item.index];
        if (u) map.set(u.hash >>> 0, i);
      }
    }
    cache.decoded = decoded;
    cache.planIndex = map;
    return map;
  }

  function commitEntryEdit(entry: Entry): void {
    const decoded = state.decoded;
    if (!decoded) return;
    const hash = entry.hash >>> 0;
    const info = buildHashMap(schema).get(hash);
    const typeMatches = info?.leaf.type === entry.type;
    const values = decoded.values;
    const plan = decoded.plan;

    const planIdx = planIndexFor(decoded).get(hash) ?? -1;

    if (planIdx === -1) {
      if (typeMatches && info) {
        values[info.path] = decodeValue(entry);
        plan.push({ kind: 'known', path: info.path });
        cache.planIndex?.set(hash, plan.length - 1);
      } else {
        const idx = decoded.unknowns.length;
        decoded.unknowns.push(cloneEntry(entry));
        plan.push({ kind: 'unknown', index: idx });
        cache.planIndex?.set(hash, plan.length - 1);
      }
      state.dirty = true;
      schedulePersist(kind);
      return;
    }

    const item = plan[planIdx];
    if (item.kind === 'known') {
      if (!typeMatches) {
        throw new Error(
          `commitEntryEdit: type mismatch for hash 0x${hash.toString(16)} (schema=${info?.leaf.type}, entry=${entry.type})`,
        );
      }
      values[item.path] = decodeValue(entry);
    } else {
      decoded.unknowns[item.index] = cloneEntry(entry);
      if (typeMatches && info) {
        values[info.path] = decodeValue(entry);
        plan[planIdx] = { kind: 'known', path: info.path };
      }
    }
    state.dirty = true;
    schedulePersist(kind);
  }

  function downloadModified(): void {
    const bytes = getSaveBytes(kind);
    if (!bytes) return;
    const save = getSave(kind);
    downloadBytes(bytes, save?.name ?? expectedFileName[kind]);
    track('export', { mode: 'single', kinds: kind, kind_count: 1 });
  }

  function wrap(inner: Accessor<K>): Accessor<K> {
    return {
      has: (leaf) => inner.has(leaf),
      get: (leaf) => inner.get(leaf),
      getElement: (leaf, i) => inner.getElement(leaf, i),
      set(leaf, v) {
        inner.set(leaf, v);
        state.dirty = true;
        schedulePersist(kind);
      },
      setElement(leaf, i, v) {
        inner.setElement(leaf, i, v);
        state.dirty = true;
        schedulePersist(kind);
      },
    };
  }

  function accessor(): Accessor<K> | null {
    const decoded = state.decoded;
    if (!decoded) return null;
    if (cache.accessor && cache.decoded === decoded) return cache.accessor;
    cache.decoded = decoded;
    cache.accessor = wrap(createMaterializedAccessor<K>(schema, decoded));
    return cache.accessor;
  }

  return { state, syncFromSave, commitEntryEdit, downloadModified, accessor };
}
