import { emptyFootprintRect } from '$lib/map/actors/actors';
import { rowFootprintRectInto } from '$lib/map/actors/ugcDimensions.svelte';
import type { MapObjectRow } from '$lib/map/state/mapObjectsEditor.svelte';

type MiniMapCorner = 'bottom-right' | 'bottom-left';

type ViewLike = {
  zoom: number;
  panX: number;
  panY: number;
  stageW: number;
  stageH: number;
};

export function preferredCorner(
  view: ViewLike,
  selection: ReadonlySet<number>,
  rows: readonly MapObjectRow[],
  miniW: number,
  miniH: number,
  gap: number,
): MiniMapCorner {
  if (selection.size === 0) return 'bottom-right';

  const x0 = view.stageW - miniW - gap;
  const y0 = view.stageH - miniH - gap;
  const x1 = x0 + miniW;
  const y1 = y0 + miniH;

  const fp = emptyFootprintRect();
  for (const row of rows) {
    if (!selection.has(row.index)) continue;
    if (row.x < 0 || row.y < 0) continue;
    rowFootprintRectInto(row, fp);
    const fx0 = view.panX + (row.x + fp.x0) * view.zoom;
    const fy0 = view.panY + (row.y + fp.y0) * view.zoom;
    const fx1 = fx0 + fp.w * view.zoom;
    const fy1 = fy0 + fp.h * view.zoom;
    if (fx1 <= x0 || fx0 >= x1) continue;
    if (fy1 <= y0 || fy0 >= y1) continue;
    return 'bottom-left';
  }
  return 'bottom-right';
}
