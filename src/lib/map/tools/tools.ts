import { pushAction, StrokeBuilder, type TileChange } from '../state/history.svelte';
import {
  commitTileChanges,
  getTileByIndex,
  getUgcByIndex,
  inBounds,
  indexFromXY,
  MAP_HEIGHT,
  MAP_TILE_COUNT,
  MAP_WIDTH,
  setTileIndex,
  setUgcIndex,
} from '../state/mapEditor.svelte';

export class RectangleStroke {
  private readonly tileHash: number;
  private readonly ugcOverride: number | undefined;
  private readonly startX: number;
  private readonly startY: number;
  private readonly originals = new Map<number, number>();
  private readonly originalsUgc = new Map<number, number>();
  private painted = new Set<number>();
  private endX: number;
  private endY: number;
  private readonly valid: boolean;

  constructor(tileHash: number, startX: number, startY: number, ugcOverride?: number) {
    this.tileHash = tileHash >>> 0;
    this.ugcOverride = ugcOverride;
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

  cancel(): void {
    if (!this.valid) return;
    let changed = 0;
    const ugcOn = this.ugcOverride !== undefined;
    for (const [index, oldValue] of this.originals) {
      if (setTileIndex(index, oldValue)) changed++;
      if (ugcOn) {
        const oldU = this.originalsUgc.get(index);
        if (oldU !== undefined && setUgcIndex(index, oldU)) changed++;
      }
    }
    commitTileChanges(changed);
  }

  end(): void {
    if (!this.valid) return;
    const changes: TileChange[] = [];
    const ugcOn = this.ugcOverride !== undefined;
    const newUgc = this.ugcOverride;
    for (const [index, oldValue] of this.originals) {
      const newValue = getTileByIndex(index);
      const tileChanged = oldValue !== newValue;
      const oldUgc = this.originalsUgc.get(index);
      const ugcChanged = ugcOn && oldUgc !== undefined && oldUgc !== newUgc;
      if (!tileChanged && !ugcChanged) continue;
      const change: TileChange = { index, oldValue, newValue };
      if (ugcChanged) {
        change.oldUgc = oldUgc;
        change.newUgc = newUgc;
      }
      changes.push(change);
    }
    if (changes.length === 0) return;
    changes.sort((a, b) => a.index - b.index);
    pushAction({ kind: 'tile', changes });
  }

  private repaint(): void {
    const x0 = Math.min(this.startX, this.endX);
    const x1 = Math.max(this.startX, this.endX);
    const y0 = Math.min(this.startY, this.endY);
    const y1 = Math.max(this.startY, this.endY);

    let changed = 0;
    const next = new Set<number>();
    const ugcOn = this.ugcOverride !== undefined;
    const newUgc = this.ugcOverride ?? 0;

    for (const idx of this.painted) {
      const x = (idx / MAP_HEIGHT) | 0;
      const y = idx % MAP_HEIGHT;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
        next.add(idx);
      } else {
        if (setTileIndex(idx, this.originals.get(idx)!)) changed++;
        if (ugcOn) {
          const oldU = this.originalsUgc.get(idx);
          if (oldU !== undefined && setUgcIndex(idx, oldU)) changed++;
        }
      }
    }

    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const idx = indexFromXY(x, y);
        if (!this.originals.has(idx)) this.originals.set(idx, getTileByIndex(idx));
        if (ugcOn && !this.originalsUgc.has(idx)) {
          this.originalsUgc.set(idx, getUgcByIndex(idx));
        }
        if (setTileIndex(idx, this.tileHash)) changed++;
        if (ugcOn && setUgcIndex(idx, newUgc)) changed++;
        next.add(idx);
      }
    }

    this.painted = next;
    commitTileChanges(changed);
  }
}

export function floodFill(
  startX: number,
  startY: number,
  newTileHash: number,
  ugcOverride?: number,
): void {
  if (!inBounds(startX, startY)) return;
  const startIndex = indexFromXY(startX, startY);
  const source = getTileByIndex(startIndex);
  newTileHash = newTileHash >>> 0;
  if (source === newTileHash && ugcOverride === undefined) return;

  const builder = new StrokeBuilder();
  const visited = new Uint8Array(MAP_TILE_COUNT);
  const queue: number[] = [startIndex];
  visited[startIndex] = 1;
  let head = 0;

  while (head < queue.length) {
    const idx = queue[head++];
    if (getTileByIndex(idx) !== source) continue;

    builder.apply(idx, newTileHash, ugcOverride);

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
