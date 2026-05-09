import { decodeZsFile } from '$lib/ugc/codec';
import { ugcCanvasFileName, ugcTexFileName } from '$lib/shareMii/codec/ugcKinds';
import { getSidecarStore } from '$lib/shareMii/sidecar/sidecarStore.svelte';

type CacheEntry = {
  bytes: Uint8Array;
  bitmap: ImageBitmap | null;
};

const state = $state<{ rev: number }>({ rev: 0 });

// eslint-disable-next-line svelte/prefer-svelte-reactivity
const cache = new Map<number, CacheEntry>();
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const inflight = new Map<number, { promise: Promise<void>; bytes: Uint8Array }>();
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const pending = new Map<number, { name: string; bytes: Uint8Array }>();

export function ugcFloorTexturesRev(): number {
  return state.rev;
}

export function getUgcFloorBitmap(slot: number): ImageBitmap | null {
  const entry = cache.get(slot);
  return entry?.bitmap ?? null;
}

function pickBytesForSlot(
  files: ReadonlyMap<string, Uint8Array>,
  slot: number,
): { name: string; bytes: Uint8Array } | null {
  const canvasName = ugcCanvasFileName('MapFloor', slot);
  const canvasBytes = files.get(canvasName);
  if (canvasBytes) return { name: canvasName, bytes: canvasBytes };
  const texName = ugcTexFileName('MapFloor', slot);
  const texBytes = files.get(texName);
  if (texBytes) return { name: texName, bytes: texBytes };
  return null;
}

const FLOOR_PREFIX = 'UgcMapFloor';

function slotsFromSidecar(files: ReadonlyMap<string, Uint8Array>): Set<number> {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const slots = new Set<number>();
  for (const name of files.keys()) {
    if (!name.startsWith(FLOOR_PREFIX)) continue;
    const idxStr = name.slice(FLOOR_PREFIX.length, FLOOR_PREFIX.length + 3);
    if (!/^\d{3}$/.test(idxStr)) continue;
    const next = name.charAt(FLOOR_PREFIX.length + 3);
    if (next === '_') continue;
    if (next !== '.') continue;
    slots.add(parseInt(idxStr, 10));
  }
  return slots;
}

function bumpRev(): void {
  state.rev = (state.rev + 1) | 0;
}

async function decodeSlot(slot: number, name: string, bytes: Uint8Array): Promise<void> {
  try {
    const decoded = await decodeZsFile(name, bytes);
    const data = new ImageData(
      decoded.rgba as Uint8ClampedArray<ArrayBuffer>,
      decoded.width,
      decoded.height,
    );
    const bitmap = await createImageBitmap(data);
    cache.get(slot)?.bitmap?.close();
    cache.set(slot, { bytes, bitmap });
    bumpRev();
  } catch (e) {
    console.warn(`UGC floor decode failed for slot ${slot}`, e);
    cache.get(slot)?.bitmap?.close();
    cache.set(slot, { bytes, bitmap: null });
    bumpRev();
  } finally {
    inflight.delete(slot);
    const next = pending.get(slot);
    if (next && next.bytes !== bytes) {
      pending.delete(slot);
      const promise = decodeSlot(slot, next.name, next.bytes);
      inflight.set(slot, { promise, bytes: next.bytes });
    } else {
      pending.delete(slot);
    }
  }
}

export function syncUgcFloorTextures(): Promise<void> {
  const sidecar = getSidecarStore();
  const files = sidecar.files;
  const liveSlots = slotsFromSidecar(files);

  for (const slot of cache.keys()) {
    if (!liveSlots.has(slot)) {
      const entry = cache.get(slot);
      entry?.bitmap?.close();
      cache.delete(slot);
      inflight.delete(slot);
      pending.delete(slot);
      bumpRev();
    }
  }

  for (const slot of liveSlots) {
    const picked = pickBytesForSlot(files, slot);
    if (!picked) continue;
    const existing = cache.get(slot);
    if (existing && existing.bytes === picked.bytes) continue;
    const current = inflight.get(slot);
    if (current) {
      if (current.bytes === picked.bytes) continue;
      pending.set(slot, picked);
      continue;
    }
    const promise = decodeSlot(slot, picked.name, picked.bytes);
    inflight.set(slot, { promise, bytes: picked.bytes });
  }

  if (inflight.size === 0) return Promise.resolve();
  return Promise.allSettled([...inflight.values()].map((e) => e.promise)).then(() => undefined);
}
