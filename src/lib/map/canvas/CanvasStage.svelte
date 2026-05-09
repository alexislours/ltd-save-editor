<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { floorTiles, inBounds, indexFromXY, mapState } from '$lib/map/state/mapEditor.svelte';
  import { getUgcAt, ugcIndex, UGC_NONE } from '../state/ugcEditor.svelte';
  import { renderUgc, UGC_TEXTURE_HEIGHT, UGC_TEXTURE_WIDTH, UGC_TILE_PIXELS } from './ugcRenderer';
  import { syncUgcFloorTextures, ugcFloorTexturesRev } from '../state/ugcFloorTextures.svelte';
  import { syncUgcObjectTextures, ugcObjectTexturesRev } from '../state/ugcObjectTextures.svelte';
  import { floorBaseline } from '../state/baseline.svelte';
  import { renderDiff } from './diffRenderer';
  import { emptyFootprintRect, isFenceActor } from '$lib/map/actors/actors';
  import { ACTOR_FOOTPRINT, DEFAULT_FOOTPRINT } from '$lib/map/actors/generatedActorNames';
  import {
    rowFootprintRectInto,
    syncUgcDimensions,
    ugcDimensionsRev,
  } from '$lib/map/actors/ugcDimensions.svelte';
  import {
    bumpObjectsRev,
    clearSlot,
    getRow,
    liveRows,
    objectsState,
    placeAt,
    restoreObject,
    setPosition,
    setRotation,
    snapshot,
    type ObjectSnapshot,
  } from '$lib/map/state/mapObjectsEditor.svelte';
  import { pushAction, redo, type ObjectChange, undo } from '$lib/map/state/history.svelte';
  import { floodFill, RectangleStroke } from '$lib/map/tools/tools';
  import { showToast } from '$lib/toast/toast.svelte';
  import { createRouter, step as routerStep, type RouterEmit } from '../input/pointerRouter';
  import ContextMenu from '../shell/ContextMenu.svelte';
  import { FLOOR_TEXTURE_HEIGHT, FLOOR_TEXTURE_WIDTH, renderFloor } from './floorRenderer';
  import { PATTERN_SIZE, refreshTilePatternSaturation } from '../tiles/tilePatterns';
  import { getTheme } from '$lib/theme/theme.svelte';
  import { renderFences, renderObjects } from './objectsRenderer';
  import { renderGridOverlay } from './gridRenderer';
  import { renderTierBorder } from './tierRenderer';
  import { player } from '$lib/sav/schema';
  import { playerAccessor, playerState } from '$lib/player/playerEditor.svelte';
  import { layers, modeState, setPainting } from '../state/layers.svelte';
  import MiniMap from '../shell/MiniMap.svelte';
  import { paintState, selectTileHash, ugcForPaint } from '../tools/paintState.svelte';
  import { BrushStrokeV2 } from '../tools/brushStroke';
  import { replaceAll } from '../tools/replaceTool';
  import { registerDropTarget } from '../input/dragDrop';
  import {
    clear as clearSelection,
    selection,
    set as setSelection,
    toggle as toggleSelection,
  } from '../tools/selection.svelte';
  import { rectFromCorners, renderMarquee, type MarqueeRect } from './marqueeRenderer';
  import {
    COLLISION_GRID_H,
    COLLISION_GRID_W,
    collisionCountAt,
    computeCollisions,
    renderCollisions,
  } from './collisionOverlay';
  import { flashState, renderFlash, resetFlash } from '../input/snapTo.svelte';
  import {
    clampPan,
    panBy,
    setStageSize,
    setZoomAtPoint,
    tileFromClient,
    view,
    ZOOM_MAX,
    ZOOM_MIN,
  } from '../state/viewTransform.svelte';
  import FindPalette from '../find/FindPalette.svelte';
  import { installKeymap, keymapState } from '../input/keymap.svelte';

  type HoverInfo = { x: number; y: number; collisionCount?: number; ugcIndex?: number } | null;
  type Props = {
    onHover?: (info: HoverInfo) => void;
  };

  let { onHover }: Props = $props();

  let stageEl: HTMLElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  let floorOff: HTMLCanvasElement;
  let floorCtx: CanvasRenderingContext2D | null = null;
  let floorImage: ImageData | null = null;

  let ugcOff: HTMLCanvasElement;
  let ugcCtx: CanvasRenderingContext2D | null = null;

  let diffOff: HTMLCanvasElement;
  let diffCtx: CanvasRenderingContext2D | null = null;
  let diffImage: ImageData | null = null;

  let floorDirty = true;
  let ugcDirty = true;
  let diffDirty = true;
  let rafPending = false;
  let bufferW = 0;
  let bufferH = 0;

  let panning = $state(false);
  const spaceHeld = $derived(keymapState.spaceHeld);
  type Drag = { pointerId: number; startCssX: number; startCssY: number };
  let drag: Drag | null = null;

  let brush: BrushStrokeV2 | null = null;
  let rectStroke: RectangleStroke | null = null;
  let paintPointerId: number | null = null;
  let pickingHeld = false;

  type ObjectDrag = {
    pointerId: number;
    index: number;
    before: ObjectSnapshot;
    moved: boolean;
  };
  let objectDrag: ObjectDrag | null = null;

  type GroupDrag = {
    pointerId: number;
    baseTileX: number;
    baseTileY: number;
    before: Map<number, ObjectSnapshot>;
    lastDx: number;
    lastDy: number;
    moved: boolean;
  };
  let groupDrag: GroupDrag | null = null;

  type MarqueeMode = 'replace' | 'union' | 'subtract';
  type Marquee = {
    pointerId: number;
    startCssX: number;
    startCssY: number;
    curCssX: number;
    curCssY: number;
    mode: MarqueeMode;
    initial: ReadonlySet<number>;
  };
  let marquee = $state<Marquee | null>(null);

  const collisionMask = new Uint8Array(COLLISION_GRID_W * COLLISION_GRID_H);
  let collisionMaskReady = $state(false);
  let hotCollision = $state<{ x: number; y: number } | null>(null);

  const unlockMapLevel = $derived.by(() => {
    void playerState.loadId;
    void playerState.dirty;
    const acc = playerAccessor();
    if (!acc) return null;
    if (!acc.has(player.Player.UnlockMapLevel)) return null;
    const v = acc.get(player.Player.UnlockMapLevel);
    return v >= 1 && v <= 4 ? v : null;
  });

  const WHEEL_SENSITIVITY = 0.0015;

  const router = createRouter();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const pendingPointerEvents = new Map<number, PointerEvent>();
  let longPressTickHandle: number | null = null;

  type GestureCapture = {
    startZoom: number;
    rotateIndex: number | null;
    rotateStartStored: number;
    rotateBefore: ObjectSnapshot | null;
    rotateLastApplied: number;
  };
  let gestureCapture: GestureCapture | null = null;

  type ContextMenuState = {
    open: boolean;
    cssX: number;
    cssY: number;
    clientX: number;
    clientY: number;
    tile: { x: number; y: number } | null;
    objectIndex: number | null;
  };
  let menu = $state<ContextMenuState>({
    open: false,
    cssX: 0,
    cssY: 0,
    clientX: 0,
    clientY: 0,
    tile: null,
    objectIndex: null,
  });

  function closeMenu(): void {
    menu = { ...menu, open: false };
  }

  function ensureBuffer(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    view.dpr = dpr;
    const w = Math.max(1, Math.round(view.stageW * dpr));
    const h = Math.max(1, Math.round(view.stageH * dpr));
    if (w === bufferW && h === bufferH) return;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${view.stageW}px`;
    canvas.style.height = `${view.stageH}px`;
    bufferW = w;
    bufferH = h;
  }

  function regenerateFloor(): void {
    if (!floorCtx || !floorImage) return;
    renderFloor(floorImage, floorTiles());
    floorCtx.putImageData(floorImage, 0, 0);
    floorDirty = false;
  }

  function regenerateUgc(): void {
    if (!ugcCtx) return;
    renderUgc(ugcCtx, ugcIndex());
    ugcDirty = false;
  }

  function regenerateDiff(): void {
    if (!diffCtx || !diffImage) return;
    const tiles = floorTiles();
    const baseline = floorBaseline();
    if (!tiles || !baseline) {
      const buf32 = new Uint32Array(diffImage.data.buffer);
      buf32.fill(0);
    } else {
      renderDiff(diffImage, tiles, baseline);
    }
    diffCtx.putImageData(diffImage, 0, 0);
    diffDirty = false;
  }

  function paint(): void {
    rafPending = false;
    if (!ctx) return;
    ensureBuffer();
    if (floorDirty) regenerateFloor();
    if (ugcDirty) regenerateUgc();
    if (diffDirty && layers.diff.visible) regenerateDiff();

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, bufferW, bufferH);

    if (layers.floor.visible) {
      const scale = (view.zoom / PATTERN_SIZE) * dpr;
      ctx.setTransform(scale, 0, 0, scale, view.panX * dpr, view.panY * dpr);
      ctx.globalAlpha = layers.floor.opacity;
      ctx.drawImage(floorOff, 0, 0);
      ctx.globalAlpha = 1;
    }

    if (layers.ugc.visible) {
      const scale = (view.zoom / UGC_TILE_PIXELS) * dpr;
      ctx.setTransform(scale, 0, 0, scale, view.panX * dpr, view.panY * dpr);
      ctx.globalAlpha = layers.ugc.opacity;
      ctx.drawImage(ugcOff, 0, 0);
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    const needRows = layers.objects.visible || layers.fence.visible;
    const rows = needRows ? liveRows() : null;
    if (layers.objects.visible) {
      renderObjects(ctx, view, rows!, layers.objects.opacity, selection.indices);
    }
    if (layers.fence.visible) {
      renderFences(ctx, view, rows!, layers.fence.opacity, selection.indices);
    }
    if (layers.diff.visible) {
      const scale = (view.zoom / PATTERN_SIZE) * dpr;
      ctx.setTransform(scale, 0, 0, scale, view.panX * dpr, view.panY * dpr);
      ctx.globalAlpha = layers.diff.opacity;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(diffOff, 0, 0);
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (collisionMaskReady) {
      renderCollisions(ctx, view, collisionMask, hotCollision);
    }
    if (layers.grid.visible) {
      renderGridOverlay(ctx, view, layers.grid.opacity);
    }
    if (layers.tier.visible && unlockMapLevel != null) {
      renderTierBorder(ctx, view, unlockMapLevel, layers.tier.opacity);
    }

    if (marquee) {
      const r = rectFromCorners(
        marquee.startCssX,
        marquee.startCssY,
        marquee.curCssX,
        marquee.curCssY,
      );
      renderMarquee(ctx, view, r);
    }

    renderFlash(ctx, view);
  }

  function schedulePaint(): void {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(paint);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.imageSmoothingEnabled = false;

    floorOff = document.createElement('canvas');
    floorOff.width = FLOOR_TEXTURE_WIDTH;
    floorOff.height = FLOOR_TEXTURE_HEIGHT;
    const fc = floorOff.getContext('2d', { willReadFrequently: false });
    if (!fc) throw new Error('Offscreen 2D context unavailable');
    floorCtx = fc;
    floorImage = fc.createImageData(FLOOR_TEXTURE_WIDTH, FLOOR_TEXTURE_HEIGHT);

    ugcOff = document.createElement('canvas');
    ugcOff.width = UGC_TEXTURE_WIDTH;
    ugcOff.height = UGC_TEXTURE_HEIGHT;
    const uc = ugcOff.getContext('2d', { willReadFrequently: false });
    if (!uc) throw new Error('Offscreen UGC 2D context unavailable');
    ugcCtx = uc;

    diffOff = document.createElement('canvas');
    diffOff.width = FLOOR_TEXTURE_WIDTH;
    diffOff.height = FLOOR_TEXTURE_HEIGHT;
    const dc = diffOff.getContext('2d', { willReadFrequently: false });
    if (!dc) throw new Error('Offscreen diff 2D context unavailable');
    diffCtx = dc;
    diffImage = dc.createImageData(FLOOR_TEXTURE_WIDTH, FLOOR_TEXTURE_HEIGHT);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const cr = entry.contentRect;
      setStageSize(cr.width, cr.height);
      schedulePaint();
    });
    ro.observe(stageEl);

    const uninstallKeymap = installKeymap();

    registerDropTarget({
      hitTest(clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
      },
      drop(actorKey, clientX, clientY) {
        const t = tileFromClientCoords(clientX, clientY);
        if (!t) return;
        const change = placeAt(actorKey, t.x, t.y, 0);
        if (change == null) {
          showToast('error', $_('map.objects.save_full'));
          return;
        }
        pushAction({ kind: 'object', changes: [change] });
        setSelection([change.index]);
      },
    });

    const blockGesture = (ev: Event): void => {
      const t = ev.target as Node | null;
      if (t && stageEl.contains(t)) ev.preventDefault();
    };
    window.addEventListener('gesturestart', blockGesture, { passive: false });
    window.addEventListener('gesturechange', blockGesture, { passive: false });
    window.addEventListener('gestureend', blockGesture, { passive: false });

    return () => {
      ro.disconnect();
      uninstallKeymap();
      registerDropTarget(null);
      stopLongPressTicker();
      resetFlash();
      window.removeEventListener('gesturestart', blockGesture);
      window.removeEventListener('gesturechange', blockGesture);
      window.removeEventListener('gestureend', blockGesture);
    };
  });

  $effect(() => {
    if (!keymapState.spaceHeld && panning && drag) {
      endPan();
    }
  });

  $effect(() => {
    void mapState.tileRev;
    void mapState.ready;
    floorBaseline();
    floorDirty = true;
    ugcDirty = true;
    diffDirty = true;
    schedulePaint();
  });

  $effect(() => {
    syncUgcFloorTextures();
  });

  $effect(() => {
    void ugcFloorTexturesRev();
    ugcDirty = true;
    schedulePaint();
  });

  $effect(() => {
    syncUgcObjectTextures();
  });

  $effect(() => {
    void ugcObjectTexturesRev();
    schedulePaint();
  });

  $effect(() => {
    syncUgcDimensions();
  });

  $effect(() => {
    void ugcDimensionsRev();
    schedulePaint();
  });

  $effect(() => {
    void getTheme();
    if (refreshTilePatternSaturation()) {
      floorDirty = true;
      schedulePaint();
    }
  });

  $effect(() => {
    void objectsState.rev;
    computeCollisions(liveRows(), collisionMask);
    collisionMaskReady = true;
    schedulePaint();
  });

  $effect(() => {
    void selection.rev;
    schedulePaint();
  });

  $effect(() => {
    if (marquee) schedulePaint();
  });

  $effect(() => {
    void flashState.rev;
    schedulePaint();
  });

  $effect(() => {
    void view.zoom;
    void view.panX;
    void view.panY;
    void view.stageW;
    void view.stageH;
    void layers.rev;
    void unlockMapLevel;
    schedulePaint();
  });

  function clientToCss(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function emitHover(e: PointerEvent | null): void {
    if (!e) {
      hotCollision = null;
      onHover?.(null);
      schedulePaint();
      return;
    }
    const { x, y } = clientToCss(e);
    const t = tileFromClient(x, y);
    if (!inBounds(t.x, t.y)) {
      hotCollision = null;
      onHover?.(null);
      schedulePaint();
      return;
    }
    const collisionCount = collisionMaskReady ? collisionCountAt(collisionMask, t.x, t.y) : 0;
    const nextHot = collisionCount >= 2 ? { x: t.x, y: t.y } : null;
    if (nextHot?.x !== hotCollision?.x || nextHot?.y !== hotCollision?.y) {
      hotCollision = nextHot;
      schedulePaint();
    }
    const ugc = layers.ugc.visible ? getUgcAt(t.x, t.y) : UGC_NONE;
    onHover?.({
      x: t.x,
      y: t.y,
      collisionCount,
      ugcIndex: ugc !== UGC_NONE ? ugc : undefined,
    });
  }

  function computeMarqueeSelection(m: Marquee): Set<number> {
    const r = rectFromCorners(m.startCssX, m.startCssY, m.curCssX, m.curCssY);
    const inside = indicesInsideCssRect(r);
    if (m.mode === 'replace') return inside;
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const out = new Set(m.initial);
    if (m.mode === 'union') {
      for (const i of inside) out.add(i);
    } else {
      for (const i of inside) out.delete(i);
    }
    return out;
  }

  function indicesInsideCssRect(r: MarqueeRect): Set<number> {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const out = new Set<number>();
    if (r.w < 1 && r.h < 1) return out;
    const tile = view.zoom;
    const tx0 = (r.x - view.panX) / tile;
    const ty0 = (r.y - view.panY) / tile;
    const tx1 = (r.x + r.w - view.panX) / tile;
    const ty1 = (r.y + r.h - view.panY) / tile;
    const rows = liveRows();
    const fp = emptyFootprintRect();
    for (const row of rows) {
      if (row.x < 0 || row.y < 0) continue;
      rowFootprintRectInto(row, fp);
      const fx0 = row.x + fp.x0;
      const fy0 = row.y + fp.y0;
      const fx1 = fx0 + fp.w;
      const fy1 = fy0 + fp.h;
      if (fx1 <= tx0 || fx0 >= tx1) continue;
      if (fy1 <= ty0 || fy0 >= ty1) continue;
      out.add(row.index);
    }
    return out;
  }

  function tileFromEvent(
    e: PointerEvent,
  ): { x: number; y: number; subX: number; subY: number } | null {
    const { x, y } = clientToCss(e);
    const t = tileFromClient(x, y);
    return inBounds(t.x, t.y) ? { x: t.x, y: t.y, subX: t.subX, subY: t.subY } : null;
  }

  function tileFromClientCoords(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = canvas.getBoundingClientRect();
    const t = tileFromClient(clientX - rect.left, clientY - rect.top);
    return inBounds(t.x, t.y) ? { x: t.x, y: t.y } : null;
  }

  const FENCE_HIT_THICK = 0.18;

  function fenceBarHit(actor: number, rotDeg: number, subX: number, subY: number): boolean {
    const raw = ACTOR_FOOTPRINT.get(actor >>> 0) ?? DEFAULT_FOOTPRINT;
    const t = ((Math.round(rotDeg / 90) % 4) + 4) % 4;
    const horizontal = raw.w >= raw.h ? t % 2 === 0 : t % 2 === 1;
    if (horizontal) return t === 2 ? subY <= FENCE_HIT_THICK : subY >= 1 - FENCE_HIT_THICK;
    return t === 3 ? subX <= FENCE_HIT_THICK : subX >= 1 - FENCE_HIT_THICK;
  }

  function hitTestObject(tx: number, ty: number, subX = 0.5, subY = 0.5): number | null {
    const rows = liveRows();
    let bestNonFence: number | null = null;
    let bestNonFenceArea = Infinity;
    let bestFence: number | null = null;
    let bestFenceArea = Infinity;
    const fp = emptyFootprintRect();
    for (const r of rows) {
      rowFootprintRectInto(r, fp);
      const x0 = r.x + fp.x0;
      const y0 = r.y + fp.y0;
      if (tx < x0 || tx >= x0 + fp.w) continue;
      if (ty < y0 || ty >= y0 + fp.h) continue;
      const area = fp.w * fp.h;
      if (isFenceActor(r.actor)) {
        if (!fenceBarHit(r.actor, r.rot, subX, subY)) continue;
        if (area < bestFenceArea) {
          bestFenceArea = area;
          bestFence = r.index;
        }
      } else if (area < bestNonFenceArea) {
        bestNonFenceArea = area;
        bestNonFence = r.index;
      }
    }
    return bestFence ?? bestNonFence;
  }

  function pickTileAt(c: { x: number; y: number }): void {
    const tiles = floorTiles();
    if (!tiles) return;
    selectTileHash(tiles[indexFromXY(c.x, c.y)] >>> 0);
  }

  function endPaint(pointerId: number, canceled = false): void {
    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    if (brush) {
      if (canceled) brush.cancel();
      else brush.end();
      brush = null;
    }
    if (rectStroke) {
      if (canceled) rectStroke.cancel();
      else rectStroke.end();
      rectStroke = null;
    }
    pickingHeld = false;
    paintPointerId = null;
    setPainting(false);
  }

  function startPan(e: PointerEvent): void {
    panning = true;
    drag = { pointerId: e.pointerId, startCssX: e.clientX, startCssY: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  }

  function endPan(): void {
    if (drag && canvas.hasPointerCapture(drag.pointerId)) {
      canvas.releasePointerCapture(drag.pointerId);
    }
    drag = null;
    panning = false;
    clampPan();
  }

  function onSinglePointerDown(e: PointerEvent): void {
    canvas.focus();
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      startPan(e);
      return;
    }

    if (modeState.mode === 'select') {
      if (e.button !== 0) return;
      const css = clientToCss(e);
      const t = tileFromEvent(e);
      const hit = t ? hitTestObject(t.x, t.y, t.subX, t.subY) : null;

      if (hit == null) {
        const mode: MarqueeMode = e.shiftKey ? 'union' : e.altKey ? 'subtract' : 'replace';
        canvas.setPointerCapture(e.pointerId);
        marquee = {
          pointerId: e.pointerId,
          startCssX: css.x,
          startCssY: css.y,
          curCssX: css.x,
          curCssY: css.y,
          mode,
          initial: new Set(selection.indices),
        };
        return;
      }

      if (e.shiftKey) {
        toggleSelection(hit);
        return;
      }

      if (!selection.indices.has(hit)) {
        setSelection([hit]);
      }

      if (selection.indices.size > 1 && t) {
        // eslint-disable-next-line svelte/prefer-svelte-reactivity
        const before = new Map<number, ObjectSnapshot>();
        for (const i of selection.indices) {
          const s = snapshot(i);
          if (s) before.set(i, s);
        }
        canvas.setPointerCapture(e.pointerId);
        groupDrag = {
          pointerId: e.pointerId,
          baseTileX: t.x,
          baseTileY: t.y,
          before,
          lastDx: 0,
          lastDy: 0,
          moved: false,
        };
        return;
      }

      const before = snapshot(hit);
      if (!before) return;
      canvas.setPointerCapture(e.pointerId);
      objectDrag = { pointerId: e.pointerId, index: hit, before, moved: false };
      return;
    }

    if (modeState.mode !== 'paint') return;

    const c = tileFromEvent(e);
    if (!c) return;

    if (e.button === 2) {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      paintPointerId = e.pointerId;
      pickingHeld = true;
      pickTileAt(c);
      return;
    }
    if (e.button !== 0) return;

    canvas.setPointerCapture(e.pointerId);
    paintPointerId = e.pointerId;

    const tool = paintState.tool;
    if (tool === 'picker') {
      pickingHeld = true;
      pickTileAt(c);
      return;
    }
    const ugc = ugcForPaint(e.altKey);
    if (tool === 'fill') {
      floodFill(c.x, c.y, paintState.selectedTileHash, ugc);
      return;
    }
    if (tool === 'replace') {
      const tiles = floorTiles();
      if (!tiles) return;
      const fromHash = tiles[indexFromXY(c.x, c.y)] >>> 0;
      const toHash = paintState.selectedTileHash >>> 0;
      const changes = replaceAll(fromHash, toHash, ugc);
      if (changes.length === 0) return;
      pushAction({ kind: 'tile', changes });
      return;
    }
    if (tool === 'rectangle') {
      rectStroke = new RectangleStroke(paintState.selectedTileHash, c.x, c.y, ugc);
      setPainting(true);
      return;
    }
    brush = new BrushStrokeV2(
      paintState.selectedTileHash,
      paintState.brushSize,
      paintState.brushShape,
      c.x,
      c.y,
      ugc,
    );
    setPainting(true);
  }

  function onSinglePointerMove(e: PointerEvent): void {
    if (panning && drag && e.pointerId === drag.pointerId) {
      const dx = e.clientX - drag.startCssX;
      const dy = e.clientY - drag.startCssY;
      drag.startCssX = e.clientX;
      drag.startCssY = e.clientY;
      panBy(dx, dy);
      return;
    }
    emitHover(e);

    if (marquee && e.pointerId === marquee.pointerId) {
      const css = clientToCss(e);
      marquee.curCssX = css.x;
      marquee.curCssY = css.y;
      const previewSet = computeMarqueeSelection(marquee);
      setSelection(previewSet);
      schedulePaint();
      return;
    }

    if (groupDrag && e.pointerId === groupDrag.pointerId) {
      const t = tileFromEvent(e);
      if (!t) return;
      const dx = t.x - groupDrag.baseTileX;
      const dy = t.y - groupDrag.baseTileY;
      if (dx === groupDrag.lastDx && dy === groupDrag.lastDy) return;
      groupDrag.lastDx = dx;
      groupDrag.lastDy = dy;
      let any = false;
      for (const [index, snap] of groupDrag.before) {
        if (setPosition(index, snap.gridX + dx, snap.gridY + dy)) any = true;
      }
      if (any) groupDrag.moved = true;
      return;
    }

    if (objectDrag && e.pointerId === objectDrag.pointerId) {
      const t = tileFromEvent(e);
      if (!t) return;
      if (setPosition(objectDrag.index, t.x, t.y)) {
        objectDrag.moved = true;
      }
      return;
    }

    if (paintPointerId !== e.pointerId) return;
    const c = tileFromEvent(e);
    if (!c) return;

    if (pickingHeld) {
      pickTileAt(c);
      return;
    }
    if (brush) {
      brush.continueTo(c.x, c.y);
      return;
    }
    if (rectStroke) {
      rectStroke.continueTo(c.x, c.y);
    }
  }

  function onSinglePointerUp(e: PointerEvent, canceled = false): void {
    if (drag && e.pointerId === drag.pointerId) {
      endPan();
    }
    if (marquee && e.pointerId === marquee.pointerId) {
      const m = marquee;
      marquee = null;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      if (!canceled) {
        const dragged =
          Math.abs(m.curCssX - m.startCssX) > 2 || Math.abs(m.curCssY - m.startCssY) > 2;
        if (!dragged && m.mode === 'replace') {
          clearSelection();
        } else {
          const finalSet = computeMarqueeSelection(m);
          setSelection(finalSet);
        }
      }
      schedulePaint();
    }
    if (groupDrag && e.pointerId === groupDrag.pointerId) {
      const gd = groupDrag;
      groupDrag = null;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      if (canceled) {
        if (gd.moved) {
          let any = false;
          for (const [index, before] of gd.before) {
            if (restoreObject(index, before)) any = true;
          }
          if (any) bumpObjectsRev();
          schedulePaint();
        }
      } else if (gd.moved) {
        const changes: ObjectChange[] = [];
        for (const [index, before] of gd.before) {
          const after = snapshot(index);
          if (!after) continue;
          if (after.gridX === before.gridX && after.gridY === before.gridY) continue;
          changes.push({ index, before, after });
        }
        if (changes.length > 0) {
          pushAction({ kind: 'object', changes });
        }
      }
    }
    if (objectDrag && e.pointerId === objectDrag.pointerId) {
      const od = objectDrag;
      objectDrag = null;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      if (canceled) {
        if (od.moved) {
          if (restoreObject(od.index, od.before)) bumpObjectsRev();
          schedulePaint();
        }
      } else if (od.moved) {
        const after = snapshot(od.index);
        if (after) {
          pushAction({
            kind: 'object',
            changes: [{ index: od.index, before: od.before, after }],
          });
        }
      }
    }
    if (paintPointerId === e.pointerId) {
      endPaint(e.pointerId, canceled);
    }
  }

  function onPointerLeave(): void {
    emitHover(null);
  }

  function applyEmits(emits: RouterEmit[]): void {
    for (const m of emits) {
      switch (m.type) {
        case 'singleStart': {
          const e = pendingPointerEvents.get(m.id);
          if (!e) break;
          if (canvas.isConnected && !canvas.hasPointerCapture(m.id)) {
            try {
              canvas.setPointerCapture(m.id);
            } catch {
              // ignore
            }
          }
          onSinglePointerDown(e);
          ensureLongPressTicker();
          break;
        }
        case 'singleMove': {
          const e = pendingPointerEvents.get(m.id);
          if (e) onSinglePointerMove(e);
          break;
        }
        case 'singleEnd': {
          const e = pendingPointerEvents.get(m.id);
          if (e) onSinglePointerUp(e, m.canceled);
          stopLongPressTicker();
          pendingPointerEvents.delete(m.id);
          break;
        }
        case 'longPress': {
          openContextMenuAt(m.x, m.y);
          break;
        }
        case 'gestureStart': {
          startMultiGesture();
          break;
        }
        case 'panDelta': {
          panBy(m.dx, m.dy);
          break;
        }
        case 'pinchDelta': {
          if (gestureCapture) {
            const target = gestureCapture.startZoom * m.scale;
            const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, target));
            setZoomAtPoint(z, m.midX, m.midY);
          }
          break;
        }
        case 'rotateDelta': {
          applyRotateDelta(m.deltaDeg);
          break;
        }
        case 'gestureEnd': {
          endMultiGesture();
          break;
        }
        case 'multiFingerTap': {
          if (m.count === 3) undo();
          break;
        }
        case 'multiFingerSwipe': {
          if (m.count === 3 && m.dir === 'right') redo();
          else if (m.count === 3 && m.dir === 'left') undo();
          break;
        }
      }
    }
  }

  function ensureLongPressTicker(): void {
    if (longPressTickHandle != null) return;
    const tick = (): void => {
      if (router.phase !== 'single') {
        longPressTickHandle = null;
        return;
      }
      const emits = routerStep(router, { type: 'tick', t: performance.now() });
      applyEmits(emits);
      if (router.phase === 'single' && longPressTickHandle != null) {
        longPressTickHandle = requestAnimationFrame(tick);
      } else {
        longPressTickHandle = null;
      }
    };
    longPressTickHandle = requestAnimationFrame(tick);
  }

  function stopLongPressTicker(): void {
    if (longPressTickHandle != null) {
      cancelAnimationFrame(longPressTickHandle);
      longPressTickHandle = null;
    }
  }

  function openContextMenuAt(cssX: number, cssY: number): void {
    const synthetic = pendingPointerEvents.values().next().value;
    if (synthetic) onSinglePointerUp(synthetic);
    pendingPointerEvents.clear();
    const rect = canvas.getBoundingClientRect();
    const t = tileFromClient(cssX, cssY);
    const tile = inBounds(t.x, t.y) ? { x: t.x, y: t.y } : null;
    const objectIndex = tile ? hitTestObject(tile.x, tile.y, t.subX, t.subY) : null;
    menu = {
      open: true,
      cssX,
      cssY,
      clientX: rect.left + cssX,
      clientY: rect.top + cssY,
      tile,
      objectIndex,
    };
  }

  function startMultiGesture(): void {
    closeMenu();
    if (drag) endPan();
    if (paintPointerId != null) endPaint(paintPointerId);
    if (marquee) {
      marquee = null;
      schedulePaint();
    }
    if (objectDrag) objectDrag = null;
    if (groupDrag) groupDrag = null;

    let rotateIndex: number | null = null;
    if (selection.indices.size === 1) {
      for (const i of selection.indices) {
        rotateIndex = i;
        break;
      }
    }
    const beforeSnap = rotateIndex != null ? snapshot(rotateIndex) : null;
    gestureCapture = {
      startZoom: view.zoom,
      rotateIndex,
      rotateStartStored: beforeSnap?.rotY ?? 0,
      rotateBefore: beforeSnap,
      rotateLastApplied: beforeSnap?.rotY ?? 0,
    };
  }

  function applyRotateDelta(deltaDeg: number): void {
    if (!gestureCapture || gestureCapture.rotateIndex == null) return;
    const startDisplay = (360 - gestureCapture.rotateStartStored) % 360;
    const newDisplay = (((startDisplay + deltaDeg) % 360) + 360) % 360;
    const next = (360 - newDisplay) % 360;
    if (Object.is(next, gestureCapture.rotateLastApplied)) return;
    if (setRotation(gestureCapture.rotateIndex, next)) {
      gestureCapture.rotateLastApplied = next;
    }
  }

  function endMultiGesture(): void {
    if (!gestureCapture) return;
    const cap = gestureCapture;
    gestureCapture = null;
    clampPan();
    if (cap.rotateIndex != null && cap.rotateBefore) {
      const after = snapshot(cap.rotateIndex);
      if (after && !Object.is(after.rotY, cap.rotateBefore.rotY)) {
        const before = { ...after, rotY: cap.rotateBefore.rotY };
        pushAction({
          kind: 'object',
          changes: [{ index: cap.rotateIndex, before, after }],
        });
      }
    }
  }

  function onPointerDown(e: PointerEvent): void {
    dismissEmptyHint();
    if (e.pointerType === 'mouse') {
      pendingPointerEvents.set(e.pointerId, e);
      onSinglePointerDown(e);
      return;
    }
    pendingPointerEvents.set(e.pointerId, e);
    const emits = routerStep(router, {
      type: 'down',
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
    });
    applyEmits(emits);
  }

  function onPointerMove(e: PointerEvent): void {
    if (e.pointerType === 'mouse') {
      pendingPointerEvents.set(e.pointerId, e);
      onSinglePointerMove(e);
      return;
    }
    pendingPointerEvents.set(e.pointerId, e);
    const emits = routerStep(router, {
      type: 'move',
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
    });
    applyEmits(emits);
  }

  function onPointerUp(e: PointerEvent): void {
    if (e.pointerType === 'mouse') {
      onSinglePointerUp(e);
      pendingPointerEvents.delete(e.pointerId);
      return;
    }
    pendingPointerEvents.set(e.pointerId, e);
    const emits = routerStep(router, {
      type: 'up',
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
    });
    applyEmits(emits);
  }

  function onPointerCancel(e: PointerEvent): void {
    if (e.pointerType === 'mouse') {
      hardResetMouseGestures();
      pendingPointerEvents.delete(e.pointerId);
      return;
    }
    pendingPointerEvents.set(e.pointerId, e);
    const emits = routerStep(router, { type: 'cancel', id: e.pointerId, t: e.timeStamp });
    applyEmits(emits);
  }

  function hardResetMouseGestures(): void {
    if (drag) endPan();
    if (paintPointerId != null) endPaint(paintPointerId);
    if (marquee) {
      if (canvas.hasPointerCapture(marquee.pointerId)) {
        canvas.releasePointerCapture(marquee.pointerId);
      }
      marquee = null;
      schedulePaint();
    }
    if (groupDrag) {
      if (canvas.hasPointerCapture(groupDrag.pointerId)) {
        canvas.releasePointerCapture(groupDrag.pointerId);
      }
      groupDrag = null;
    }
    if (objectDrag) {
      if (canvas.hasPointerCapture(objectDrag.pointerId)) {
        canvas.releasePointerCapture(objectDrag.pointerId);
      }
      objectDrag = null;
    }
  }

  function onWheel(e: WheelEvent): void {
    dismissEmptyHint();
    e.preventDefault();
    const { x, y } = clientToCss(e);
    const factor = Math.exp(-e.deltaY * WHEEL_SENSITIVITY);
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, view.zoom * factor));
    setZoomAtPoint(next, x, y);
  }

  let emptyHintDismissed = $state(false);
  const showEmptyHint = $derived.by(() => {
    void objectsState.rev;
    if (emptyHintDismissed) return false;
    return liveRows().length === 0;
  });

  function dismissEmptyHint(): void {
    if (!emptyHintDismissed) emptyHintDismissed = true;
  }

  const cursorClass = $derived(
    panning
      ? 'cursor-grabbing'
      : spaceHeld
        ? 'cursor-grab'
        : modeState.mode === 'select'
          ? 'cursor-default'
          : 'cursor-crosshair',
  );
</script>

<section
  bind:this={stageEl}
  class="relative row-start-2 col-start-2 overflow-hidden shadow-[inset_0_0_24px_rgba(0,0,0,0.4)] touch-none"
  style="background: var(--map-canvas-bg);"
>
  <canvas
    bind:this={canvas}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerCancel}
    onpointerleave={onPointerLeave}
    onwheel={onWheel}
    oncontextmenu={(e) => e.preventDefault()}
    tabindex="0"
    class="block h-full w-full touch-none select-none outline-none {cursorClass}"
    style="image-rendering: pixelated;"
  ></canvas>
  <MiniMap />
  {#if showEmptyHint}
    <div
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-150 ease-out"
      aria-hidden="true"
    >
      <p
        class="rounded-2xl bg-surface/85 px-5 py-3 text-sm font-bold text-content-strong ring-1 ring-edge/60 shadow-lg backdrop-blur-md"
      >
        {$_('map.canvas.empty_hint')}
      </p>
    </div>
  {/if}
  <FindPalette />
</section>

<ContextMenu open={menu.open} x={menu.clientX} y={menu.clientY} onClose={closeMenu}>
  {#snippet items()}
    {@const tile = menu.tile}
    {@const objectIndex = menu.objectIndex}
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 h-11 text-sm font-medium text-content hover:bg-surface-muted disabled:opacity-40 disabled:cursor-default"
      disabled={!tile}
      onclick={() => {
        if (tile) pickTileAt(tile);
        closeMenu();
      }}
    >
      {$_('map.context_menu.eyedropper')}
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 h-11 text-sm font-medium text-content hover:bg-surface-muted disabled:opacity-40 disabled:cursor-default"
      disabled={!tile}
      onclick={() => {
        if (tile) {
          const tiles = floorTiles();
          if (tiles) {
            const fromHash = tiles[indexFromXY(tile.x, tile.y)] >>> 0;
            const toHash = paintState.selectedTileHash >>> 0;
            const changes = replaceAll(fromHash, toHash);
            if (changes.length > 0) pushAction({ kind: 'tile', changes });
          }
        }
        closeMenu();
      }}
    >
      {$_('map.context_menu.replace_this_tile')}
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 h-11 text-sm font-medium text-content hover:bg-surface-muted disabled:opacity-40 disabled:cursor-default"
      disabled={objectIndex == null}
      onclick={() => {
        if (objectIndex != null) {
          setSelection([objectIndex]);
        }
        closeMenu();
      }}
    >
      {$_('map.context_menu.open_object_inspector')}
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 h-11 text-sm font-medium text-content hover:bg-surface-muted disabled:opacity-40 disabled:cursor-default"
      disabled={objectIndex == null}
      onclick={() => {
        if (objectIndex != null) {
          const r = getRow(objectIndex);
          if (r) {
            const change = placeAt(r.actor, r.x, r.y, r.rot);
            if (change != null) {
              pushAction({ kind: 'object', changes: [change] });
              setSelection([change.index]);
            }
          }
        }
        closeMenu();
      }}
    >
      {$_('map.context_menu.copy')}
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 h-11 text-sm font-medium text-danger hover:bg-surface-muted disabled:opacity-40 disabled:cursor-default"
      disabled={objectIndex == null}
      onclick={() => {
        if (objectIndex != null) {
          const before = snapshot(objectIndex);
          if (before && clearSlot(objectIndex)) {
            const after = snapshot(objectIndex);
            if (after) {
              pushAction({
                kind: 'object',
                changes: [{ index: objectIndex, before, after }],
              });
            }
          }
        }
        closeMenu();
      }}
    >
      {$_('map.inspector.actions.delete')}
    </button>
  {/snippet}
</ContextMenu>

<style>
  canvas:focus-visible {
    outline: none;
  }
</style>
