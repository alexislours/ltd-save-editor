import { TILE_DEFS } from '$lib/map/tiles/tiles';
import { UGC_NONE } from '$lib/map/state/mapEditor.svelte';
import { clampBrushSize, type BrushShape, type BrushSize } from './brushKernel';

export type PaintTool = 'brush' | 'fill' | 'rectangle' | 'picker' | 'replace';

const RECENT_KEY = 'map-v2:recent-tiles';
const RECENT_MAX = 8;

type PaintState = {
  tool: PaintTool;
  brushSize: BrushSize;
  brushShape: BrushShape;
  selectedTileHash: number;
  recent: number[];
};

function loadRecent(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: number[] = [];
    for (const v of parsed) {
      if (typeof v === 'number' && Number.isFinite(v)) out.push(v >>> 0);
      if (out.length >= RECENT_MAX) break;
    }
    return out;
  } catch {
    return [];
  }
}

let pendingSaveHandle: ReturnType<typeof setTimeout> | null = null;
let pendingSaveList: readonly number[] | null = null;

function flushPendingSave(): void {
  pendingSaveHandle = null;
  const list = pendingSaveList;
  pendingSaveList = null;
  if (!list || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function saveRecent(list: readonly number[]): void {
  if (typeof window === 'undefined') return;
  pendingSaveList = list;
  if (pendingSaveHandle !== null) return;
  pendingSaveHandle = setTimeout(flushPendingSave, 0);
}

export const paintState = $state<PaintState>({
  tool: 'brush',
  brushSize: 1,
  brushShape: 'square',
  selectedTileHash: TILE_DEFS[0].hash >>> 0,
  recent: loadRecent(),
});

export function setPaintTool(tool: PaintTool): void {
  paintState.tool = tool;
}

export function setBrushSize(size: BrushSize): void {
  paintState.brushSize = clampBrushSize(size);
}

export function setBrushShape(shape: BrushShape): void {
  paintState.brushShape = shape;
}

export function ugcForPaint(altKey: boolean): number | undefined {
  return altKey ? UGC_NONE : undefined;
}

export function selectTileHash(hash: number): void {
  const h = hash >>> 0;
  paintState.selectedTileHash = h;
  if (paintState.recent[0] === h) return;
  const next = [h, ...paintState.recent.filter((v) => v !== h)].slice(0, RECENT_MAX);
  paintState.recent = next;
  saveRecent(next);
}
