import type { Accessor } from '$lib/sav/materialized/accessor';
import { PLAYER_SCHEMA } from '$lib/sav/schema';
import type { DecodedRgba, FitMode } from '$lib/ugc/texture/textureReplaceState.svelte';
import { UGC_KINDS, listUgcSlots, type SidecarSource, type UgcKind } from '$lib/shareMii';
import { hasOriginal } from '$lib/shareMii/sidecar/sidecarStore.svelte';
import { ugcCanvasFileName, ugcTexFileName, ugcThumbFileName } from '$lib/shareMii/codec/ugcKinds';
import type { Bc1Mode, Encoder, Matte } from './codec';

const UGC_NAME_LEAVES = {
  Cloth: PLAYER_SCHEMA.UGC.Cloth.Name,
  Food: PLAYER_SCHEMA.UGC.Food.Name,
  Goods: PLAYER_SCHEMA.UGC.Goods.Name,
  Interior: PLAYER_SCHEMA.UGC.Interior.Name,
  Exterior: PLAYER_SCHEMA.UGC.Exterior.Name,
  MapObject: PLAYER_SCHEMA.UGC.MapObject.Name,
  MapFloor: PLAYER_SCHEMA.UGC.MapFloor.Name,
} as const;

const UGC_NETWORK_DELIVER_LEAVES = {
  Cloth: PLAYER_SCHEMA.UGC.Cloth.NetworkDeliverCount,
  Food: PLAYER_SCHEMA.UGC.Food.NetworkDeliverCount,
  Goods: PLAYER_SCHEMA.UGC.Goods.NetworkDeliverCount,
  Interior: PLAYER_SCHEMA.UGC.Interior.NetworkDeliverCount,
  Exterior: PLAYER_SCHEMA.UGC.Exterior.NetworkDeliverCount,
  MapObject: PLAYER_SCHEMA.UGC.MapObject.NetworkDeliverCount,
  MapFloor: PLAYER_SCHEMA.UGC.MapFloor.NetworkDeliverCount,
} as const;

export type UgcRow = { slot: number; name: string };

type UgcRowLabels = {
  unnamed: (slot: number) => string;
};

export function buildUgcRows(
  player: Accessor<'player'> | null,
  kind: UgcKind,
  sidecar: SidecarSource,
  labels: UgcRowLabels,
): UgcRow[] {
  if (!player) return [];
  try {
    const list = listUgcSlots({ player }, kind, sidecar);
    return list
      .filter((s) => !s.isAddNew)
      .map<UgcRow>((s) => ({
        slot: s.slot,
        name: s.name || labels.unnamed(s.slot),
      }));
  } catch {
    return [];
  }
}

export function buildKindCounts(
  player: Accessor<'player'> | null,
  sidecar: SidecarSource,
): Record<UgcKind, number> {
  const out = Object.fromEntries(UGC_KINDS.map((k) => [k, 0])) as Record<UgcKind, number>;
  if (!player) return out;
  for (const k of UGC_KINDS) {
    try {
      const list = listUgcSlots({ player }, k, sidecar);
      out[k] = list.filter((s) => !s.isAddNew).length;
    } catch {
      out[k] = 0;
    }
  }
  return out;
}

export function slotFileNames(kind: UgcKind, slot: number): string[] {
  const idx = slot - 1;
  return [ugcCanvasFileName(kind, idx), ugcTexFileName(kind, idx), ugcThumbFileName(kind, idx)];
}

export function slotPreviewCandidates(kind: UgcKind, slot: number): string[] {
  const idx = slot - 1;
  return [ugcTexFileName(kind, idx), ugcCanvasFileName(kind, idx), ugcThumbFileName(kind, idx)];
}

export function slotThumbName(kind: UgcKind, slot: number): string {
  return ugcThumbFileName(kind, slot - 1);
}

export function getSlotOriginalUgctex(
  sidecar: SidecarSource,
  kind: UgcKind,
  slot: number,
): Uint8Array | null {
  return sidecar.files.get(ugcTexFileName(kind, slot - 1)) ?? null;
}

export function isSlotEdited(kind: UgcKind, slot: number): boolean {
  for (const name of slotFileNames(kind, slot)) {
    if (hasOriginal(name)) return true;
  }
  return false;
}

export function getUgcSlotName(
  player: Accessor<'player'> | null,
  kind: UgcKind,
  slot: number,
): string {
  if (!player) return '';
  const leaf = UGC_NAME_LEAVES[kind];
  if (!player.has(leaf)) return '';
  const arr = player.get(leaf) as string[];
  return arr[slot - 1] ?? '';
}

export async function decodeSidecarToPngUrl(
  sidecar: SidecarSource,
  candidates: string[],
): Promise<string | null> {
  const codec = await import('./codec');
  for (const name of candidates) {
    const bytes = sidecar.files.get(name);
    if (!bytes) continue;
    try {
      const decoded = await codec.decodeZsFile(name, bytes);
      const blob = await codec.rgbaToPngBlob(decoded);
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn(`UGC preview failed for ${name}`, e);
    }
  }
  return null;
}

type ReplaceArgs = {
  decoded: DecodedRgba;
  kind: UgcKind;
  slot: number;
  sidecar: SidecarSource;
  encodeThumb: boolean;
  fitMode: FitMode;
  matte: Matte | null;
  bc1Mode: Bc1Mode;
  encoder: Encoder;
};

export async function buildReplaceWrites(args: ReplaceArgs): Promise<Map<string, Uint8Array>> {
  const { encodeFromRgba } = await import('./codec');
  const slotIndex = args.slot - 1;
  const ugctexName = ugcTexFileName(args.kind, slotIndex);
  const canvasName = ugcCanvasFileName(args.kind, slotIndex);
  const thumbName = ugcThumbFileName(args.kind, slotIndex);
  const original = args.sidecar.files.get(ugctexName) ?? null;
  const out = await encodeFromRgba(args.decoded, {
    originalUgctex: original,
    encodeThumb: args.encodeThumb,
    fitMode: args.fitMode,
    matte: args.matte,
    bc1Mode: args.bc1Mode,
    encoder: args.encoder,
  });
  const writes = new Map<string, Uint8Array>();
  writes.set(canvasName, out.canvas);
  writes.set(ugctexName, out.ugctex);
  if (out.thumb) writes.set(thumbName, out.thumb);
  return writes;
}

export function setUgcSlotName(
  player: Accessor<'player'>,
  kind: UgcKind,
  slot: number,
  name: string,
): void {
  const leaf = UGC_NAME_LEAVES[kind];
  if (!player.has(leaf)) throw new Error('UGC name array not present in save');
  player.setElement(leaf, slot - 1, name);
}

export function hasLanRestriction(
  player: Accessor<'player'> | null,
  kind: UgcKind,
  slot: number,
): boolean {
  if (!player) return false;
  const leaf = UGC_NETWORK_DELIVER_LEAVES[kind];
  if (!player.has(leaf)) return false;
  const arr = player.get(leaf) as number[];
  return (arr[slot - 1] ?? 0) > 0;
}

export function clearLanRestriction(player: Accessor<'player'>, kind: UgcKind, slot: number): void {
  const leaf = UGC_NETWORK_DELIVER_LEAVES[kind];
  if (!player.has(leaf)) throw new Error('UGC NetworkDeliverCount array not present in save');
  player.setElement(leaf, slot - 1, 0);
}

export async function decodeSlotToPng(
  sidecar: SidecarSource,
  kind: UgcKind,
  slot: number,
): Promise<{ fileName: string; bytes: Uint8Array } | null> {
  const slotIdx = slot - 1;
  const ugctexName = ugcTexFileName(kind, slotIdx);
  const canvasName = ugcCanvasFileName(kind, slotIdx);
  const thumbName = ugcThumbFileName(kind, slotIdx);
  const pickName =
    (sidecar.files.has(ugctexName) && ugctexName) ||
    (sidecar.files.has(canvasName) && canvasName) ||
    (sidecar.files.has(thumbName) && thumbName);
  if (!pickName) return null;
  const bytes = sidecar.files.get(pickName)!;
  const { decodeZsFile, rgbaToPngBlob } = await import('./codec');
  const decoded = await decodeZsFile(pickName, bytes);
  const blob = await rgbaToPngBlob(decoded);
  const ab = await blob.arrayBuffer();
  const fileName = `${kind}${String(slotIdx).padStart(3, '0')}.png`;
  return { fileName, bytes: new Uint8Array(ab) };
}
