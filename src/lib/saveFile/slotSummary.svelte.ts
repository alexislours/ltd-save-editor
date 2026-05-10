import { SAVE_KINDS, type SaveKind } from '$lib/saveFile/types';

export type SlotSummary = { name: string };

const summaries = $state<Record<SaveKind, SlotSummary | null>>({
  player: null,
  mii: null,
  map: null,
});

export function getSlotSummary(kind: SaveKind): SlotSummary | null {
  return summaries[kind];
}

export function setSlotSummary(kind: SaveKind, value: SlotSummary | null): void {
  summaries[kind] = value;
}

export function clearAllSlotSummaries(): void {
  for (const kind of SAVE_KINDS) summaries[kind] = null;
}
