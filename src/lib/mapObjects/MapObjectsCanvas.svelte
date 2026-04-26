<script lang="ts">
  import { onMount } from 'svelte';
  import {
    mapState as floorState,
    MAP_HEIGHT,
    MAP_WIDTH,
    indexFromXY,
  } from '../map/mapEditor.svelte';
  import { packColorRGBA, tileColorForHash } from '../map/tiles';
  import { actorDisplay, footprintRect } from './actors';
  import {
    getRow,
    GRID_HEIGHT,
    GRID_WIDTH,
    liveRows,
    objectsState,
    setPosition,
    type MapObjectRow,
  } from './mapObjectsEditor.svelte';

  type Props = {
    tileSize: number;
    selectedIndex: number | null;
    onSelect: (index: number | null) => void;
    onHover: (coords: { x: number; y: number } | null) => void;
  };

  let { tileSize, selectedIndex, onSelect, onHover }: Props = $props();

  let canvas: HTMLCanvasElement;
  let offscreen: HTMLCanvasElement;
  let offCtx: CanvasRenderingContext2D;
  let offImage: ImageData;
  let offBuf32: Uint32Array;

  onMount(() => {
    offscreen = document.createElement('canvas');
    offscreen.width = GRID_WIDTH;
    offscreen.height = GRID_HEIGHT;
    const ctx = offscreen.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('2D canvas context unavailable');
    offCtx = ctx;
    offImage = offCtx.createImageData(GRID_WIDTH, GRID_HEIGHT);
    offBuf32 = new Uint32Array(offImage.data.buffer);

    redraw();
  });

  $effect(() => {
    void objectsState.rev;
    void floorState.tileRev;
    void floorState.entry;
    void tileSize;
    void selectedIndex;
    if (offBuf32) redraw();
  });

  function redraw(): void {
    const ctx = canvas?.getContext('2d');
    if (!ctx || !offBuf32) return;

    if (floorState.entry?.payload) {
      const tiles = new Uint32Array(
        floorState.entry.payload.buffer,
        floorState.entry.payload.byteOffset + 4,
        MAP_WIDTH * MAP_HEIGHT,
      );
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const hash = tiles[indexFromXY(x, y)];
          const pixelIndex = y * MAP_WIDTH + x;
          offBuf32[pixelIndex] = dimColor(tileColorForHash(hash));
        }
      }
    } else {
      offBuf32.fill(packColorRGBA('#f3f4f6'));
    }
    offCtx.putImageData(offImage, 0, 0);

    canvas.width = GRID_WIDTH * tileSize;
    canvas.height = GRID_HEIGHT * tileSize;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

    const rows = liveRows()
      .slice()
      .sort((a, b) => footprintArea(b) - footprintArea(a));
    for (const r of rows) {
      if (r.x < 0 || r.y < 0) continue;
      drawFootprint(ctx, r, false);
    }

    if (selectedIndex != null) {
      const sel = rows.find((r) => r.index === selectedIndex);
      if (sel && sel.x >= 0 && sel.y >= 0) drawFootprint(ctx, sel, true);
    }
  }

  function footprintArea(r: MapObjectRow): number {
    const fp = footprintRect(r.actor, r.rot);
    return fp.w * fp.h;
  }

  function drawFootprint(
    ctx: CanvasRenderingContext2D,
    row: MapObjectRow,
    selected: boolean,
  ): void {
    const fp = footprintRect(row.actor, row.rot);
    const color = actorDisplay(row.actor).color;

    const rx = (row.x + fp.x0) * tileSize;
    const ry = (row.y + fp.y0) * tileSize;
    const rw = fp.w * tileSize;
    const rh = fp.h * tileSize;

    // Body fill.
    ctx.globalAlpha = selected ? 0.85 : 0.68;
    ctx.fillStyle = color;
    ctx.fillRect(rx, ry, rw, rh);

    // Outline.
    ctx.globalAlpha = 1;
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeStyle = selected ? '#0f172a' : 'rgba(0,0,0,0.55)';
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

    if ((fp.w > 1 || fp.h > 1) && fp.goalX != null && fp.goalY != null) {
      const gx = row.x + fp.goalX;
      const gy = row.y + fp.goalY;
      const gcx = gx * tileSize;
      const gcy = gy * tileSize;
      // Face away from the rect center.
      const cxRect = row.x + fp.x0 + fp.w / 2;
      const cyRect = row.y + fp.y0 + fp.h / 2;
      const dx = gx + 0.5 - cxRect;
      const dy = gy + 0.5 - cyRect;
      ctx.lineWidth = Math.max(2, tileSize * 0.25);
      ctx.strokeStyle = selected ? '#fff' : 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      if (Math.abs(dx) >= Math.abs(dy)) {
        // East/west edge
        const edgeX = dx >= 0 ? gcx + tileSize : gcx;
        ctx.moveTo(edgeX, gcy + tileSize * 0.15);
        ctx.lineTo(edgeX, gcy + tileSize * 0.85);
      } else {
        // North/south edge
        const edgeY = dy >= 0 ? gcy + tileSize : gcy;
        ctx.moveTo(gcx + tileSize * 0.15, edgeY);
        ctx.lineTo(gcx + tileSize * 0.85, edgeY);
      }
      ctx.stroke();
    }

    const ax = row.x * tileSize + tileSize / 2;
    const ay = row.y * tileSize + tileSize / 2;
    ctx.beginPath();
    ctx.arc(ax, ay, Math.max(1.5, tileSize * 0.18), 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#0f172a' : 'rgba(0,0,0,0.8)';
    ctx.fill();
  }

  function dimColor(hex: string): number {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * 0.55);
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * 0.55);
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * 0.55);
    return ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }

  function coordsFromEvent(e: PointerEvent): { x: number; y: number } | null {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = Math.floor((px / rect.width) * GRID_WIDTH);
    const y = Math.floor((py / rect.height) * GRID_HEIGHT);
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return null;
    return { x, y };
  }

  let dragState: {
    index: number;
    startCell: { x: number; y: number };
    origin: { x: number; y: number };
    moved: boolean;
  } | null = null;

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const c = coordsFromEvent(e);
    if (!c) return;

    const rows = liveRows();
    let best: { index: number; area: number } | null = null;
    for (const r of rows) {
      if (r.x < 0 || r.y < 0) continue;
      const fp = footprintRect(r.actor, r.rot);
      const lx = r.x + fp.x0,
        ly = r.y + fp.y0;
      if (c.x < lx || c.x >= lx + fp.w || c.y < ly || c.y >= ly + fp.h) continue;
      const area = fp.w * fp.h;
      if (!best || area < best.area) best = { index: r.index, area };
    }

    if (best) {
      const row = getRow(best.index);
      if (row) {
        canvas.setPointerCapture(e.pointerId);
        dragState = {
          index: best.index,
          startCell: c,
          origin: { x: row.x, y: row.y },
          moved: false,
        };
      }
      onSelect(best.index);
    } else {
      onSelect(null);
    }
  }

  function onPointerMove(e: PointerEvent): void {
    const c = coordsFromEvent(e);
    if (dragState && c) {
      const dx = c.x - dragState.startCell.x;
      const dy = c.y - dragState.startCell.y;
      if (dx !== 0 || dy !== 0) dragState.moved = true;
      setPosition(dragState.index, dragState.origin.x + dx, dragState.origin.y + dy);
    }
    onHover(c);
  }

  function endDrag(e: PointerEvent): void {
    if (!dragState) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
    dragState = null;
  }

  function onPointerUp(e: PointerEvent): void {
    endDrag(e);
  }

  function onPointerLeave(): void {
    if (!dragState) onHover(null);
  }

  function onPointerCancel(e: PointerEvent): void {
    endDrag(e);
    onHover(null);
  }
</script>

<div
  class="inline-block max-w-full overflow-auto rounded-lg border border-edge/40 bg-surface-muted"
>
  <canvas
    bind:this={canvas}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointerleave={onPointerLeave}
    onpointercancel={onPointerCancel}
    class="block touch-none select-none cursor-crosshair"
    style="image-rendering: pixelated;"
  ></canvas>
</div>
