import { PLAYER_SCHEMA } from '$lib/sav/schema';
import {
  playerAccessor,
  playerState,
  syncFromSave as syncPlayerFromSave,
} from '$lib/player/playerEditor.svelte';
import {
  actorDisplay,
  emptyFootprintRect,
  footprintRect,
  footprintRectInto,
  rotateActorFootprint,
  rotateActorFootprintInto,
  type FootprintRect,
} from './actors';
import type { ActorFootprint } from './generatedActorNames';
import { enumOptionName } from '$lib/sav/knownKeys';
import { DataType } from '$lib/sav/dataType';
import type { SchemaLeaf } from '$lib/sav/schema/leaf';

type UgcSlotInfo = {
  slot: number;
  name: string;
  size: number;
  scale: { x: number; y: number; z: number };
  type: number;
  typeLabel: string;
};

type SlotLeaves = {
  Hash: SchemaLeaf<DataType.UIntArray>;
  Name: SchemaLeaf<DataType.WString64Array>;
  Size: SchemaLeaf<DataType.FloatArray>;
  Scale: SchemaLeaf<DataType.Vector3Array>;
  UgcMapObjectType: SchemaLeaf<DataType.EnumArray>;
};

const MAP_OBJECT: SlotLeaves = PLAYER_SCHEMA.UGC.MapObject;
const EXTERIOR: SlotLeaves = PLAYER_SCHEMA.UGC.Exterior;

type Index = ReadonlyMap<number, UgcSlotInfo>;

type Snapshot = {
  loadId: number;
  mapObject: Index;
  exterior: Index;
};

const syncState = $state({ rev: 0, loadId: -1 });

let cache: Snapshot | null = null;

export function syncUgcDimensions(): void {
  syncPlayerFromSave();
  if (syncState.loadId !== playerState.loadId) {
    syncState.loadId = playerState.loadId;
    syncState.rev = (syncState.rev + 1) | 0;
    cache = null;
  }
}

export function ugcDimensionsRev(): number {
  return syncState.rev;
}

function buildIndex(acc: ReturnType<typeof playerAccessor>, leaves: SlotLeaves): Index {
  if (!acc) return new Map();
  if (
    !acc.has(leaves.Hash) ||
    !acc.has(leaves.Size) ||
    !acc.has(leaves.Scale) ||
    !acc.has(leaves.UgcMapObjectType)
  ) {
    return new Map();
  }
  const hashes = acc.get(leaves.Hash) as number[];
  const names = acc.has(leaves.Name) ? (acc.get(leaves.Name) as string[]) : [];
  const sizes = acc.get(leaves.Size) as number[];
  const scales = acc.get(leaves.Scale) as Array<{ x: number; y: number; z: number }>;
  const types = acc.get(leaves.UgcMapObjectType) as number[];

  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const out = new Map<number, UgcSlotInfo>();
  for (let i = 0; i < hashes.length; i++) {
    const uid = hashes[i] >>> 0;
    if (uid === 0) continue;
    const t = types[i] >>> 0;
    out.set(uid, {
      slot: i,
      name: names[i] ?? '',
      size: sizes[i] ?? 1,
      scale: scales[i] ?? { x: 1, y: 1, z: 1 },
      type: t,
      typeLabel: enumOptionName(t) ?? `0x${t.toString(16).padStart(8, '0')}`,
    });
  }
  return out;
}

function snapshot(): Snapshot {
  void syncState.rev;
  const acc = playerAccessor();
  const loadId = playerState.loadId;
  if (cache && cache.loadId === loadId && acc) return cache;
  const fresh: Snapshot = {
    loadId,
    mapObject: buildIndex(acc, MAP_OBJECT),
    exterior: buildIndex(acc, EXTERIOR),
  };
  cache = fresh;
  return fresh;
}

export function isPlayerLoaded(): boolean {
  void syncState.rev;
  return playerAccessor() != null;
}

function lookupUgcSlot(uid: number, kind: 'mapObject' | 'exterior'): UgcSlotInfo | null {
  if (uid === 0) return null;
  const snap = snapshot();
  const idx = kind === 'mapObject' ? snap.mapObject : snap.exterior;
  return idx.get(uid >>> 0) ?? null;
}

export function ugcKindForActor(actorHash: number): 'mapObject' | 'exterior' | null {
  const cat = actorDisplay(actorHash).category;
  if (cat === 'MapObject_Ugc_Obje') return 'mapObject';
  if (cat === 'MapObject_Ugc_House') return 'exterior';
  return null;
}

export function ugcSlotForRow(
  actor: number,
  ugcId: number,
  ugcExteriorId: number,
): UgcSlotInfo | null {
  const kind = ugcKindForActor(actor);
  if (!kind) return null;
  const uid = kind === 'mapObject' ? ugcId : ugcExteriorId;
  return lookupUgcSlot(uid, kind);
}

function ugcFootprintFromSlot(slot: UgcSlotInfo): { w: number; h: number } {
  const w = Math.max(1, Math.round(slot.size * Math.abs(slot.scale.x)));
  const h = Math.max(1, Math.round(slot.size * Math.abs(slot.scale.y)));
  return { w, h };
}

export function ugcBaseFootprint(slot: UgcSlotInfo): ActorFootprint {
  const { w, h } = ugcFootprintFromSlot(slot);
  return {
    x0: -Math.floor((w - 1) / 2),
    y0: -Math.floor((h - 1) / 2),
    w,
    h,
    goalX: null,
    goalY: null,
  };
}

type RowFootprintInput = {
  actor: number;
  rot: number;
  ugcId: number;
  ugcExteriorId: number;
};

export function rowFootprintRectInto(row: RowFootprintInput, out: FootprintRect): FootprintRect {
  const slot = ugcSlotForRow(row.actor, row.ugcId, row.ugcExteriorId);
  if (slot) return rotateActorFootprintInto(ugcBaseFootprint(slot), row.rot, out);
  return footprintRectInto(row.actor, row.rot, out);
}

export function rowFootprintRect(row: RowFootprintInput): FootprintRect {
  const slot = ugcSlotForRow(row.actor, row.ugcId, row.ugcExteriorId);
  if (slot) return rotateActorFootprint(ugcBaseFootprint(slot), row.rot);
  return footprintRect(row.actor, row.rot);
}

const SIZE_LABEL_SCRATCH = emptyFootprintRect();

export function rowFootprintSizeLabel(row: RowFootprintInput): string {
  const fp = rowFootprintRectInto({ ...row, rot: 0 }, SIZE_LABEL_SCRATCH);
  return `${fp.w}×${fp.h}`;
}
