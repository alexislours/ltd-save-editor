import { decodeZsFile } from '$lib/ugc/codec';
import { ugcCanvasFileName, ugcTexFileName, type UgcKind } from '$lib/shareMii/codec/ugcKinds';
import { getSidecarStore } from '$lib/shareMii/sidecar/sidecarStore.svelte';

type Kind = Extract<UgcKind, 'MapObject' | 'Exterior'>;
const KINDS: readonly Kind[] = ['MapObject', 'Exterior'];

type CacheEntry = {
  bytes: Uint8Array;
  bitmap: ImageBitmap | null;
};

type Key = string;
function key(kind: Kind, slot: number): Key {
  return `${kind}:${slot}`;
}

const state = $state<{ rev: number }>({ rev: 0 });

// eslint-disable-next-line svelte/prefer-svelte-reactivity
const cache = new Map<Key, CacheEntry>();
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const inflight = new Map<Key, { promise: Promise<void>; bytes: Uint8Array }>();
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const pending = new Map<Key, { name: string; bytes: Uint8Array }>();

export function ugcObjectTexturesRev(): number {
  return state.rev;
}

export function getUgcObjectBitmap(kind: Kind, slot: number): ImageBitmap | null {
  return cache.get(key(kind, slot))?.bitmap ?? null;
}

function pickBytesForSlot(
  files: ReadonlyMap<string, Uint8Array>,
  kind: Kind,
  slot: number,
): { name: string; bytes: Uint8Array } | null {
  const canvasName = ugcCanvasFileName(kind, slot);
  const canvasBytes = files.get(canvasName);
  if (canvasBytes) return { name: canvasName, bytes: canvasBytes };
  const texName = ugcTexFileName(kind, slot);
  const texBytes = files.get(texName);
  if (texBytes) return { name: texName, bytes: texBytes };
  return null;
}

function slotsFromSidecar(files: ReadonlyMap<string, Uint8Array>, kind: Kind): Set<number> {
  const prefix = `Ugc${kind}`;
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const slots = new Set<number>();
  for (const name of files.keys()) {
    if (!name.startsWith(prefix)) continue;
    const idxStr = name.slice(prefix.length, prefix.length + 3);
    if (!/^\d{3}$/.test(idxStr)) continue;
    const next = name.charAt(prefix.length + 3);
    if (next === '_') continue;
    if (next !== '.') continue;
    slots.add(parseInt(idxStr, 10));
  }
  return slots;
}

function bumpRev(): void {
  state.rev = (state.rev + 1) | 0;
}

async function decodeSlot(k: Key, name: string, bytes: Uint8Array): Promise<void> {
  try {
    const decoded = await decodeZsFile(name, bytes);
    const data = new ImageData(
      decoded.rgba as Uint8ClampedArray<ArrayBuffer>,
      decoded.width,
      decoded.height,
    );
    const bitmap = await createImageBitmap(data);
    const existing = cache.get(k);
    if (existing?.bitmap) existing.bitmap.close();
    cache.set(k, { bytes, bitmap });
    bumpRev();
  } catch (e) {
    console.warn(`UGC object decode failed for ${k}`, e);
    const existing = cache.get(k);
    if (existing?.bitmap) existing.bitmap.close();
    cache.set(k, { bytes, bitmap: null });
    bumpRev();
  } finally {
    inflight.delete(k);
    const next = pending.get(k);
    if (next && next.bytes !== bytes) {
      pending.delete(k);
      const promise = decodeSlot(k, next.name, next.bytes);
      inflight.set(k, { promise, bytes: next.bytes });
    } else {
      pending.delete(k);
    }
  }
}

export function syncUgcObjectTextures(): Promise<void> {
  const sidecar = getSidecarStore();
  const files = sidecar.files;

  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const liveKeys = new Set<Key>();
  for (const kind of KINDS) {
    for (const slot of slotsFromSidecar(files, kind)) {
      liveKeys.add(key(kind, slot));
    }
  }

  for (const k of cache.keys()) {
    if (!liveKeys.has(k)) {
      const entry = cache.get(k);
      entry?.bitmap?.close();
      cache.delete(k);
      inflight.delete(k);
      pending.delete(k);
      bumpRev();
    }
  }

  for (const kind of KINDS) {
    for (const slot of slotsFromSidecar(files, kind)) {
      const k = key(kind, slot);
      const picked = pickBytesForSlot(files, kind, slot);
      if (!picked) continue;
      const existing = cache.get(k);
      if (existing && existing.bytes === picked.bytes) continue;
      const current = inflight.get(k);
      if (current) {
        if (current.bytes === picked.bytes) continue;
        pending.set(k, picked);
        continue;
      }
      const promise = decodeSlot(k, picked.name, picked.bytes);
      inflight.set(k, { promise, bytes: picked.bytes });
    }
  }

  if (inflight.size === 0) return Promise.resolve();
  return Promise.allSettled([...inflight.values()].map((e) => e.promise)).then(() => undefined);
}
