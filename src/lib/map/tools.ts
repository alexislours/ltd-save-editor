import { pushAction, StrokeBuilder, type TileChange } from './history.svelte';
import {
  commitTileChanges,
  getTileByIndex,
  inBounds,
  indexFromXY,
  MAP_HEIGHT,
  MAP_TILE_COUNT,
  MAP_WIDTH,
  setTileIndex,
} from './mapEditor.svelte';

export type ToolKind = 'brush' | 'fill' | 'rectangle' | 'picker';

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

export class RectangleStroke {
  private readonly tileHash: number;
  private readonly startX: number;
  private readonly startY: number;
  private readonly originals = new Map<number, number>();
  private painted = new Set<number>();
  private endX: number;
  private endY: number;
  private readonly valid: boolean;

  constructor(tileHash: number, startX: number, startY: number) {
    this.tileHash = tileHash >>> 0;
    this.startX = startX;
    this.startY = startY;
    this.endX = startX;
    this.endY = startY;
    this.valid = inBounds(startX, startY);
    if (this.valid) this.repaint();
  }

  continueTo(x: number, y: number): void {
    if (!this.valid) return;
    const cx = Math.max(0, Math.min(MAP_WIDTH - 1, x));
    const cy = Math.max(0, Math.min(MAP_HEIGHT - 1, y));
    if (cx === this.endX && cy === this.endY) return;
    this.endX = cx;
    this.endY = cy;
    this.repaint();
  }

  end(): void {
    if (!this.valid) return;
    const changes: TileChange[] = [];
    for (const [index, oldValue] of this.originals) {
      const newValue = getTileByIndex(index);
      if (oldValue !== newValue) changes.push({ index, oldValue, newValue });
    }
    if (changes.length === 0) return;
    changes.sort((a, b) => a.index - b.index);
    pushAction({ name: 'Rectangle Tiles', changes });
  }

  private repaint(): void {
    const x0 = Math.min(this.startX, this.endX);
    const x1 = Math.max(this.startX, this.endX);
    const y0 = Math.min(this.startY, this.endY);
    const y1 = Math.max(this.startY, this.endY);

    let changed = 0;
    const next = new Set<number>();
    for (const idx of this.painted) {
      const x = (idx / MAP_HEIGHT) | 0;
      const y = idx % MAP_HEIGHT;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
        next.add(idx);
      } else if (setTileIndex(idx, this.originals.get(idx)!)) {
        changed++;
      }
    }

    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const idx = indexFromXY(x, y);
        if (!this.originals.has(idx)) this.originals.set(idx, getTileByIndex(idx));
        if (setTileIndex(idx, this.tileHash)) changed++;
        next.add(idx);
      }
    }

    this.painted = next;
    commitTileChanges(changed);
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
