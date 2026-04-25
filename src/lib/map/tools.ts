import { pushAction, StrokeBuilder } from './history.svelte';
import {
  commitTileChanges,
  getTileByIndex,
  inBounds,
  indexFromXY,
  MAP_HEIGHT,
  MAP_TILE_COUNT,
  MAP_WIDTH,
} from './mapEditor.svelte';

export type ToolKind = 'brush' | 'fill' | 'picker';

export class BrushStroke {
  private readonly builder = new StrokeBuilder('Paint Tiles');
  private last: { x: number; y: number } | null = null;
  private readonly tileHash: number;

  constructor(tileHash: number, startX: number, startY: number) {
    this.tileHash = tileHash >>> 0;
    if (!inBounds(startX, startY)) return;
    this.last = { x: startX, y: startY };
    const changed = this.paintLine(startX, startY, startX, startY);
    commitTileChanges(changed);
  }

  continueTo(x: number, y: number): void {
    if (!this.last || !inBounds(x, y)) return;
    if (this.last.x === x && this.last.y === y) return;
    const changed = this.paintLine(this.last.x, this.last.y, x, y);
    this.last = { x, y };
    commitTileChanges(changed);
  }

  end(): void {
    const action = this.builder.build();
    if (action) pushAction(action);
  }

  private paintLine(startX: number, startY: number, endX: number, endY: number): number {
    let x = startX;
    let y = startY;
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;
    let changed = 0;

    while (true) {
      if (this.builder.apply(indexFromXY(x, y), this.tileHash)) changed++;
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

export function floodFill(startX: number, startY: number, newTileHash: number): void {
  if (!inBounds(startX, startY)) return;
  const startIndex = indexFromXY(startX, startY);
  const source = getTileByIndex(startIndex);
  newTileHash = newTileHash >>> 0;
  if (source === newTileHash) return;

  const builder = new StrokeBuilder('Fill Tiles');
  const visited = new Uint8Array(MAP_TILE_COUNT);
  const queue: number[] = [startIndex];
  visited[startIndex] = 1;

  while (queue.length > 0) {
    const idx = queue.shift()!;
    if (getTileByIndex(idx) !== source) continue;

    builder.apply(idx, newTileHash);

    const x = (idx / MAP_HEIGHT) | 0;
    const y = idx % MAP_HEIGHT;
    tryEnqueue(x - 1, y);
    tryEnqueue(x + 1, y);
    tryEnqueue(x, y - 1);
    tryEnqueue(x, y + 1);
  }

  commitTileChanges(builder.changeCount());
  const action = builder.build();
  if (action) pushAction(action);

  function tryEnqueue(x: number, y: number): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
    const i = indexFromXY(x, y);
    if (visited[i]) return;
    visited[i] = 1;
    queue.push(i);
  }
}
