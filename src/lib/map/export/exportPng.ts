import { floorTiles, MAP_HEIGHT, MAP_WIDTH } from '$lib/map/state/mapEditor.svelte';
import { liveRows } from '$lib/map/state/mapObjectsEditor.svelte';
import { floorBaseline } from '../state/baseline.svelte';
import { renderDiff } from '../canvas/diffRenderer';
import { FLOOR_TEXTURE_HEIGHT, FLOOR_TEXTURE_WIDTH, renderFloor } from '../canvas/floorRenderer';
import { renderGridOverlay } from '../canvas/gridRenderer';
import { renderFences, renderObjects } from '../canvas/objectsRenderer';
import { PATTERN_SIZE } from '../tiles/tilePatterns';
import { renderUgc, UGC_TEXTURE_HEIGHT, UGC_TEXTURE_WIDTH } from '../canvas/ugcRenderer';
import { ugcIndex } from '../state/ugcEditor.svelte';
import { syncUgcFloorTextures } from '../state/ugcFloorTextures.svelte';

export type ExportPngLayers = {
  floor: boolean;
  objects: boolean;
  fence: boolean;
  ugc: boolean;
  diff: boolean;
  grid: boolean;
};

export type ExportBackground = 'dark' | 'light' | 'transparent';

type ExportPngOpts = {
  scale: 1 | 2 | 4 | 8;
  layers: ExportPngLayers;
  background: ExportBackground;
};

const BG_DARK = '#18181b';
const BG_LIGHT = '#fafafa';

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

function createCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  if (typeof document === 'undefined') {
    throw new Error('exportPng: no canvas available in this environment');
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function get2d(canvas: AnyCanvas): CanvasRenderingContext2D {
  const ctx = (canvas as HTMLCanvasElement).getContext('2d');
  if (!ctx) throw new Error('exportPng: 2D canvas context unavailable');
  return ctx as CanvasRenderingContext2D;
}

function blobFromCanvas(canvas: AnyCanvas): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/png' });
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('toBlob returned null'));
    }, 'image/png');
  });
}

export async function exportPng(opts: ExportPngOpts): Promise<Blob> {
  const { scale } = opts;
  const physW = MAP_WIDTH * PATTERN_SIZE * scale;
  const physH = MAP_HEIGHT * PATTERN_SIZE * scale;

  const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;

  const canvas = createCanvas(physW, physH);
  const ctx = get2d(canvas);
  ctx.imageSmoothingEnabled = false;

  if (opts.background !== 'transparent') {
    ctx.fillStyle = opts.background === 'dark' ? BG_DARK : BG_LIGHT;
    ctx.fillRect(0, 0, physW, physH);
  }

  const view = {
    zoom: (PATTERN_SIZE * scale) / dpr,
    panX: 0,
    panY: 0,
    stageW: physW / dpr,
    stageH: physH / dpr,
    dpr,
  };

  const tiles = floorTiles();

  if (opts.layers.floor) {
    const floorImage = new ImageData(FLOOR_TEXTURE_WIDTH, FLOOR_TEXTURE_HEIGHT);
    renderFloor(floorImage, tiles);
    const off = createCanvas(FLOOR_TEXTURE_WIDTH, FLOOR_TEXTURE_HEIGHT);
    get2d(off).putImageData(floorImage, 0, 0);
    drawTextureFitted(ctx, off, physW, physH);
  }

  if (opts.layers.ugc) {
    await syncUgcFloorTextures();
    const off = createCanvas(UGC_TEXTURE_WIDTH, UGC_TEXTURE_HEIGHT);
    renderUgc(get2d(off), ugcIndex());
    drawTextureFitted(ctx, off, physW, physH);
  }

  if (opts.layers.objects) {
    renderObjects(ctx, view, liveRows(), 1);
  }

  if (opts.layers.fence) {
    renderFences(ctx, view, liveRows(), 1);
  }

  if (opts.layers.diff) {
    const baseline = floorBaseline();
    if (baseline && tiles) {
      const img = new ImageData(FLOOR_TEXTURE_WIDTH, FLOOR_TEXTURE_HEIGHT);
      const cur = Array.isArray(tiles) ? tiles : Array.from(tiles);
      renderDiff(img, cur, baseline);
      const off = createCanvas(FLOOR_TEXTURE_WIDTH, FLOOR_TEXTURE_HEIGHT);
      get2d(off).putImageData(img, 0, 0);
      drawTextureFitted(ctx, off, physW, physH);
    }
  }

  if (opts.layers.grid) {
    renderGridOverlay(ctx, view, 1);
  }

  return await blobFromCanvas(canvas);
}

function drawTextureFitted(
  ctx: CanvasRenderingContext2D,
  source: AnyCanvas,
  destW: number,
  destH: number,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(source as CanvasImageSource, 0, 0, destW, destH);
  ctx.restore();
}

export function defaultExportFilename(): string {
  const ts = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
  return `map-${ts}.png`;
}
