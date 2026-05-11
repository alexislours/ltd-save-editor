import { UGC_NONE } from '$lib/map/state/mapEditor.svelte';

export type TileClipboard = {
  width: number;
  height: number;
  mask: Uint8Array;
  floor: Uint32Array;
  ugc: Int32Array;
};

type ClipboardState = {
  clip: TileClipboard | null;
  pasting: boolean;
  rev: number;
};

export const tileClipboardState = $state<ClipboardState>({
  clip: null,
  pasting: false,
  rev: 0,
});

function bump(): void {
  tileClipboardState.rev = (tileClipboardState.rev + 1) | 0;
}

export function setClipboard(clip: TileClipboard | null): void {
  tileClipboardState.clip = clip;
  if (!clip) tileClipboardState.pasting = false;
  bump();
}

export function hasClipboard(): boolean {
  return tileClipboardState.clip != null;
}

export function startPaste(): boolean {
  if (!tileClipboardState.clip) return false;
  tileClipboardState.pasting = true;
  bump();
  return true;
}

export function cancelPaste(): void {
  if (!tileClipboardState.pasting) return;
  tileClipboardState.pasting = false;
  bump();
}

export function emptyClipboard(width: number, height: number): TileClipboard {
  return {
    width,
    height,
    mask: new Uint8Array(width * height),
    floor: new Uint32Array(width * height),
    ugc: new Int32Array(width * height).fill(UGC_NONE),
  };
}
