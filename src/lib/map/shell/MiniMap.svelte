<script lang="ts">
  import { actorDisplay, emptyFootprintRect, isFenceActor } from '$lib/map/actors/actors';
  import { rowFootprintRectInto } from '$lib/map/actors/ugcDimensions.svelte';
  import { floorTiles, MAP_HEIGHT, MAP_WIDTH, mapState } from '$lib/map/state/mapEditor.svelte';
  import { liveRows, objectsState } from '$lib/map/state/mapObjectsEditor.svelte';
  import { packColorRGBA, tileColorForHash } from '$lib/map/tiles/tiles';
  import { layers, miniMapState, stageInteract } from '../state/layers.svelte';
  import { selection } from '../tools/selection.svelte';
  import { clampPan, view } from '../state/viewTransform.svelte';
  import { preferredCorner } from '../tiles/miniMapPlacement';
  import { getTheme } from '$lib/theme/theme.svelte';
  import { onMount } from 'svelte';

  const SCALE = 2;
  const CSS_W = MAP_WIDTH * SCALE;
  const CSS_H = MAP_HEIGHT * SCALE;
  const EDGE_GAP = 12;
  const CORNER_RADIUS = 12;

  function readEmptyColor(): string {
    if (typeof document === 'undefined') return '#3f3f46';
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--map-canvas-empty')
      .trim();
    return v.startsWith('#') && (v.length === 7 || v.length === 4) ? v : '#3f3f46';
  }

  let canvas: HTMLCanvasElement = $state()!;
  let ctx: CanvasRenderingContext2D | null = null;

  let composite: ImageData | null = null;
  let compositeOff: HTMLCanvasElement;
  let compositeCtx: CanvasRenderingContext2D | null = null;
  let compositeDirty = true;

  let bufferW = 0;
  let bufferH = 0;

  let rafPending = false;
  let dragging = false;
  let pointerId: number | null = null;

  let animRaf = 0;
  let animFrom = { panX: 0, panY: 0 };
  let animTo = { panX: 0, panY: 0 };
  let animStart = 0;
  const ANIM_MS = 150;

  const corner = $derived(
    preferredCorner(view, selection.indices, liveRows(), CSS_W, CSS_H, EDGE_GAP),
  );

  const fadeOut = $derived(stageInteract.painting);

  function recomposite(): void {
    if (!composite || !compositeCtx) return;
    const tiles = floorTiles();
    const buf32 = new Uint32Array(composite.data.buffer);
    if (layers.floor.visible && tiles) {
      for (let ty = 0; ty < MAP_HEIGHT; ty++) {
        for (let tx = 0; tx < MAP_WIDTH; tx++) {
          buf32[ty * MAP_WIDTH + tx] = packColorRGBA(tileColorForHash(tiles[tx * MAP_HEIGHT + ty]));
        }
      }
    } else {
      buf32.fill(packColorRGBA(readEmptyColor()));
    }

    if (layers.objects.visible || layers.fence.visible) {
      const rows = liveRows();
      const fp = emptyFootprintRect();
      for (const row of rows) {
        if (row.x < 0 || row.y < 0) continue;
        const fence = isFenceActor(row.actor);
        if (fence ? !layers.fence.visible : !layers.objects.visible) continue;
        rowFootprintRectInto(row, fp);
        const fx0 = row.x + fp.x0;
        const fy0 = row.y + fp.y0;
        const color = packColorRGBA(actorDisplay(row.actor).color);
        for (let dy = 0; dy < fp.h; dy++) {
          const yy = fy0 + dy;
          if (yy < 0 || yy >= MAP_HEIGHT) continue;
          let dst = yy * MAP_WIDTH + fx0;
          for (let dx = 0; dx < fp.w; dx++) {
            const xx = fx0 + dx;
            if (xx >= 0 && xx < MAP_WIDTH) buf32[dst] = color;
            dst++;
          }
        }
      }
    }
    compositeCtx.putImageData(composite, 0, 0);
    compositeDirty = false;
  }

  function ensureBuffer(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(CSS_W * dpr));
    const h = Math.max(1, Math.round(CSS_H * dpr));
    if (w === bufferW && h === bufferH) return;
    canvas.width = w;
    canvas.height = h;
    bufferW = w;
    bufferH = h;
  }

  function paint(): void {
    rafPending = false;
    if (!ctx) return;
    ensureBuffer();
    if (compositeDirty) recomposite();

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CSS_W, CSS_H);
    ctx.drawImage(compositeOff, 0, 0, CSS_W, CSS_H);

    const x0 = -view.panX / view.zoom;
    const y0 = -view.panY / view.zoom;
    const x1 = (view.stageW - view.panX) / view.zoom;
    const y1 = (view.stageH - view.panY) / view.zoom;

    const rx = x0 * SCALE;
    const ry = y0 * SCALE;
    const rw = (x1 - x0) * SCALE;
    const rh = (y1 - y0) * SCALE;

    const cx = Math.max(0, Math.min(CSS_W, rx));
    const cy = Math.max(0, Math.min(CSS_H, ry));
    const cx2 = Math.max(0, Math.min(CSS_W, rx + rw));
    const cy2 = Math.max(0, Math.min(CSS_H, ry + rh));
    const cw = cx2 - cx;
    const ch = cy2 - cy;

    if (cw > 0 && ch > 0) {
      const r = CORNER_RADIUS;
      const overflowL = Math.max(0, -rx);
      const overflowR = Math.max(0, rx + rw - CSS_W);
      const overflowT = Math.max(0, -ry);
      const overflowB = Math.max(0, ry + rh - CSS_H);
      const tl = Math.min(r, overflowL, overflowT);
      const tr = Math.min(r, overflowR, overflowT);
      const br = Math.min(r, overflowR, overflowB);
      const bl = Math.min(r, overflowL, overflowB);

      ctx.fillStyle = 'rgba(249,115,22,0.18)';
      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, ch, [tl, tr, br, bl]);
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(249,115,22,1)';
      ctx.beginPath();
      ctx.roundRect(cx + 0.75, cy + 0.75, cw - 1.5, ch - 1.5, [
        Math.max(0, tl - 0.75),
        Math.max(0, tr - 0.75),
        Math.max(0, br - 0.75),
        Math.max(0, bl - 0.75),
      ]);
      ctx.stroke();
    }
  }

  function schedulePaint(): void {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(paint);
  }

  function setPanForMiniMapPoint(mmX: number, mmY: number, clamped = true): void {
    const worldCx = mmX / SCALE;
    const worldCy = mmY / SCALE;
    view.panX = view.stageW / 2 - worldCx * view.zoom;
    view.panY = view.stageH / 2 - worldCy * view.zoom;
    if (clamped) clampPan();
  }

  function cancelAnim(): void {
    if (animRaf) {
      cancelAnimationFrame(animRaf);
      animRaf = 0;
    }
  }

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateTo(targetPanX: number, targetPanY: number): void {
    cancelAnim();
    animFrom = { panX: view.panX, panY: view.panY };
    animTo = { panX: targetPanX, panY: targetPanY };
    animStart = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - animStart) / ANIM_MS);
      const k = easeOutCubic(t);
      view.panX = animFrom.panX + (animTo.panX - animFrom.panX) * k;
      view.panY = animFrom.panY + (animTo.panY - animFrom.panY) * k;
      if (t < 1) {
        animRaf = requestAnimationFrame(tick);
      } else {
        animRaf = 0;
        clampPan();
      }
    };
    animRaf = requestAnimationFrame(tick);
  }

  function localPoint(e: PointerEvent): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function isInsideViewportRect(p: { x: number; y: number }): boolean {
    const x0 = -view.panX / view.zoom;
    const y0 = -view.panY / view.zoom;
    const x1 = (view.stageW - view.panX) / view.zoom;
    const y1 = (view.stageH - view.panY) / view.zoom;
    const rx = x0 * SCALE;
    const ry = y0 * SCALE;
    const rw = (x1 - x0) * SCALE;
    const rh = (y1 - y0) * SCALE;
    return p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh;
  }

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    canvas.setPointerCapture(e.pointerId);
    pointerId = e.pointerId;
    dragging = false;
    const p = localPoint(e);

    const insideRect = isInsideViewportRect(p);
    if (insideRect) {
      dragging = true;
      cancelAnim();
      setPanForMiniMapPoint(p.x, p.y);
      return;
    }

    const worldCx = p.x / SCALE;
    const worldCy = p.y / SCALE;
    const targetPanX = view.stageW / 2 - worldCx * view.zoom;
    const targetPanY = view.stageH / 2 - worldCy * view.zoom;
    animateTo(targetPanX, targetPanY);
  }

  function onPointerMove(e: PointerEvent): void {
    if (pointerId !== e.pointerId) return;
    const p = localPoint(e);
    if (!dragging) {
      dragging = true;
      cancelAnim();
    }
    setPanForMiniMapPoint(p.x, p.y);
  }

  function onPointerUp(e: PointerEvent): void {
    if (pointerId !== e.pointerId) return;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    pointerId = null;
    dragging = false;
  }

  function onCanvasPointerEnter(e: PointerEvent): void {
    const p = localPoint(e);
    canvas.style.cursor = isInsideViewportRect(p) ? 'move' : 'crosshair';
  }

  function onCanvasPointerOver(e: PointerEvent): void {
    if (pointerId !== null) return;
    const p = localPoint(e);
    canvas.style.cursor = isInsideViewportRect(p) ? 'move' : 'crosshair';
  }

  onMount(() => {
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Mini-map 2D context unavailable');
    c.imageSmoothingEnabled = false;
    ctx = c;

    const off = document.createElement('canvas');
    off.width = MAP_WIDTH;
    off.height = MAP_HEIGHT;
    const cc = off.getContext('2d');
    if (!cc) throw new Error('Mini-map composite context unavailable');
    compositeOff = off;
    compositeCtx = cc;
    composite = cc.createImageData(MAP_WIDTH, MAP_HEIGHT);
    compositeDirty = true;
    schedulePaint();

    return () => {
      cancelAnim();
      ctx = null;
      compositeCtx = null;
      composite = null;
    };
  });

  $effect(() => {
    void mapState.tileRev;
    void mapState.ready;
    void objectsState.rev;
    void layers.rev;
    void getTheme();
    compositeDirty = true;
    schedulePaint();
  });

  $effect(() => {
    void view.zoom;
    void view.panX;
    void view.panY;
    void view.stageW;
    void view.stageH;
    schedulePaint();
  });

  const cornerClass = $derived(corner === 'bottom-left' ? 'left-3' : 'right-3');
</script>

{#if miniMapState.visible}
  <div
    class="absolute bottom-3 {cornerClass} z-20 overflow-hidden rounded-xl bg-surface/80 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.4)] ring-1 ring-edge/60 backdrop-blur-md transition-opacity duration-150 ease-out"
    class:opacity-0={fadeOut}
    class:pointer-events-none={fadeOut}
    aria-hidden={fadeOut}
  >
    <canvas
      bind:this={canvas}
      width={CSS_W}
      height={CSS_H}
      style="width: {CSS_W}px; height: {CSS_H}px; image-rendering: pixelated; border-radius: {CORNER_RADIUS}px;"
      class="block touch-none select-none"
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onpointerenter={onCanvasPointerEnter}
      onpointerover={onCanvasPointerOver}
    ></canvas>
  </div>
{/if}
