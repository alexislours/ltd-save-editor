<script lang="ts">
  import { onMount } from 'svelte';
  import { inBounds, indexFromXY, MAP_HEIGHT, MAP_WIDTH, mapState } from './mapEditor.svelte';
  import { packColorRGBA, tileColorForHash } from './tiles';
  import { BrushStroke, floodFill, RectangleStroke, type ToolKind } from './tools';

  type Props = {
    tileSize: number;
    selectedTileHash: number;
    tool: ToolKind;
    onHover: (coords: { x: number; y: number } | null) => void;
    onPickTile: (hash: number) => void;
  };

  let { tileSize, selectedTileHash, tool, onHover, onPickTile }: Props = $props();

  let canvas: HTMLCanvasElement;
  let offscreen: HTMLCanvasElement;
  let offCtx: CanvasRenderingContext2D;
  let offImage: ImageData;
  let offBuf32: Uint32Array;

  let stroke: BrushStroke | RectangleStroke | null = null;
  let picking = false;

  onMount(() => {
    offscreen = document.createElement('canvas');
    offscreen.width = MAP_WIDTH;
    offscreen.height = MAP_HEIGHT;
    const ctx = offscreen.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('2D canvas context unavailable');
    offCtx = ctx;
    offImage = offCtx.createImageData(MAP_WIDTH, MAP_HEIGHT);
    offBuf32 = new Uint32Array(offImage.data.buffer);

    redraw();
  });

  $effect(() => {
    void mapState.tileRev;
    void mapState.entry;
    void tileSize;
    if (offBuf32) redraw();
  });

  function redraw(): void {
    const ctx = canvas?.getContext('2d');
    if (!ctx || !offBuf32) return;

    if (mapState.entry?.payload) {
      const tiles = new Uint32Array(
        mapState.entry.payload.buffer,
        mapState.entry.payload.byteOffset + 4,
        MAP_WIDTH * MAP_HEIGHT,
      );
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const hash = tiles[indexFromXY(x, y)];
          const pixelIndex = y * MAP_WIDTH + x;
          offBuf32[pixelIndex] = packColorRGBA(tileColorForHash(hash));
        }
      }
    } else {
      offBuf32.fill(packColorRGBA('#f3f4f6'));
    }
    offCtx.putImageData(offImage, 0, 0);

    canvas.width = MAP_WIDTH * tileSize;
    canvas.height = MAP_HEIGHT * tileSize;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
  }

  function coordsFromEvent(e: PointerEvent | MouseEvent): { x: number; y: number } | null {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = Math.floor((px / rect.width) * MAP_WIDTH);
    const y = Math.floor((py / rect.height) * MAP_HEIGHT);
    return inBounds(x, y) ? { x, y } : null;
  }

  function onPointerDown(e: PointerEvent): void {
    const c = coordsFromEvent(e);
    if (!c) return;

    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      picking = true;
      canvas.setPointerCapture(e.pointerId);
      const tiles = tilesView();
      if (tiles) onPickTile(tiles[indexFromXY(c.x, c.y)]);
      return;
    }
    if (e.button !== 0) return;

    canvas.setPointerCapture(e.pointerId);

    if (tool === 'picker') {
      const tiles = tilesView();
      if (tiles) onPickTile(tiles[indexFromXY(c.x, c.y)]);
      picking = true;
      return;
    }
    if (tool === 'fill') {
      floodFill(c.x, c.y, selectedTileHash);
      return;
    }
    if (tool === 'rectangle') {
      stroke = new RectangleStroke(selectedTileHash, c.x, c.y);
      return;
    }
    stroke = new BrushStroke(selectedTileHash, c.x, c.y);
  }

  function onPointerMove(e: PointerEvent): void {
    const c = coordsFromEvent(e);
    onHover(c);

    if (picking) {
      if (!c) return;
      const tiles = tilesView();
      if (tiles) onPickTile(tiles[indexFromXY(c.x, c.y)]);
      return;
    }

    if (!stroke || !c) return;
    stroke.continueTo(c.x, c.y);
  }

  function onPointerUp(e: PointerEvent): void {
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    if (picking) {
      picking = false;
      return;
    }
    if (stroke) {
      stroke.end();
      stroke = null;
    }
  }

  function onPointerLeave(): void {
    onHover(null);
  }

  function tilesView(): Uint32Array | null {
    if (!mapState.entry?.payload) return null;
    return new Uint32Array(
      mapState.entry.payload.buffer,
      mapState.entry.payload.byteOffset + 4,
      MAP_WIDTH * MAP_HEIGHT,
    );
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
    onpointercancel={onPointerUp}
    onpointerleave={onPointerLeave}
    oncontextmenu={(e) => e.preventDefault()}
    class="block cursor-crosshair touch-none select-none"
    style="image-rendering: pixelated;"
  ></canvas>
</div>
