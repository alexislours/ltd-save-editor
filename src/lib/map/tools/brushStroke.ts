import { pushAction, StrokeBuilder } from '$lib/map/state/history.svelte';
import {
  commitTileChanges,
  inBounds,
  indexFromXY,
  setTileIndex,
  setUgcIndex,
} from '$lib/map/state/mapEditor.svelte';
import { kernelOffsets, type BrushShape, type BrushSize } from './brushKernel';

export class BrushStrokeV2 {
  private readonly builder = new StrokeBuilder();
  private readonly kernel: Int16Array;
  private readonly tileHash: number;
  private readonly ugcOverride: number | undefined;
  private last: { x: number; y: number } | null = null;

  constructor(
    tileHash: number,
    size: BrushSize,
    shape: BrushShape,
    startX: number,
    startY: number,
    ugcOverride?: number,
  ) {
    this.tileHash = tileHash >>> 0;
    this.ugcOverride = ugcOverride;
    this.kernel = kernelOffsets(size, shape);
    if (!inBounds(startX, startY)) return;
    this.last = { x: startX, y: startY };
    const changed = this.stampLine(startX, startY, startX, startY);
    commitTileChanges(changed);
  }

  continueTo(x: number, y: number): void {
    if (!this.last) return;
    if (this.last.x === x && this.last.y === y) return;
    const changed = this.stampLine(this.last.x, this.last.y, x, y);
    this.last = { x, y };
    commitTileChanges(changed);
  }

  end(): void {
    const action = this.builder.build();
    if (action) pushAction(action);
  }

  cancel(): void {
    const action = this.builder.build();
    if (!action) return;
    let changed = 0;
    for (const c of action.changes) {
      if (setTileIndex(c.index, c.oldValue)) changed++;
      if (c.oldUgc !== undefined && setUgcIndex(c.index, c.oldUgc)) changed++;
    }
    commitTileChanges(changed);
  }

  private stamp(cx: number, cy: number): number {
    let changed = 0;
    const k = this.kernel;
    for (let i = 0; i < k.length; i += 2) {
      const x = cx + k[i];
      const y = cy + k[i + 1];
      if (!inBounds(x, y)) continue;
      if (this.builder.apply(indexFromXY(x, y), this.tileHash, this.ugcOverride)) changed++;
    }
    return changed;
  }

  private stampLine(startX: number, startY: number, endX: number, endY: number): number {
    let x = startX;
    let y = startY;
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;
    let changed = 0;
    while (true) {
      changed += this.stamp(x, y);
      if (x === endX && y === endY) return changed;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
}
