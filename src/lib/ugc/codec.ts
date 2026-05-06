import {
  compress as zstdCompress,
  decompress as zstdDecompress,
  init as zstdInit,
} from '@bokuweb/zstd-wasm';
import { ensureUgcWasm, type UgcWasm } from './wasm/bridge';
import { Bc1Mode as Bc1ModeEnum, FitMode as FitModeEnum } from './wasm/types';

function detectThreadCount(): number {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return Math.max(1, Math.min(8, navigator.hardwareConcurrency));
  }
  return 4;
}

let threadingDisabled = false;

async function bcEncodeWithFallback(
  wasm: UgcWasm,
  format: TextureFormat,
  linRgba: Float32Array,
  srgbRgba: Uint8Array,
  w: number,
  h: number,
  encoder: Encoder,
  bc1Mode: Bc1ModeEnum = Bc1ModeEnum.Auto,
): Promise<Uint8Array> {
  if (format === 'Bc1' && encoder === 'rgbcx') {
    return wasm.bc1EncodeRgbcx(linRgba, w, h);
  }
  if (!threadingDisabled) {
    try {
      const threads = detectThreadCount();
      if (format === 'Bc1') {
        return await wasm.bc1EncodeThreaded(linRgba, srgbRgba, w, h, bc1Mode, threads);
      }
      return await wasm.bc3EncodeThreaded(linRgba, srgbRgba, w, h, threads);
    } catch (e) {
      threadingDisabled = true;
      console.warn('Threaded BC encode failed, falling back to single-threaded', e);
      try {
        const { terminateBcThreadPool } = await import('./wasm/threadPool');
        await terminateBcThreadPool();
      } catch {
        // ignore
      }
    }
  }
  if (format === 'Bc1') return wasm.bc1Encode(linRgba, srgbRgba, w, h, bc1Mode);
  return wasm.bc3Encode(linRgba, srgbRgba, w, h);
}

type TextureKind = 'Canvas' | 'Ugctex' | 'Thumb';
type TextureFormat = 'Bc1' | 'Bc3';

type UgctexLayout = {
  width: number;
  height: number;
  blockHeight: number;
  format: TextureFormat;
  bytesPerBlock: number;
};

const DEFAULT_BLOCK_HEIGHT = 16;
const THUMB_BLOCK_HEIGHT = 8;
const ZSTD_LEVEL = 16;

let zstdReady: Promise<void> | null = null;
function ensureZstd(): Promise<void> {
  if (!zstdReady) zstdReady = zstdInit();
  return zstdReady;
}

function detectKind(fileName: string): TextureKind {
  const lower = fileName.toLowerCase();
  if (lower.includes('thumb')) return 'Thumb';
  if (lower.includes('ugctex')) return 'Ugctex';
  return 'Canvas';
}

function detectUgctexLayout(decompressedBytes: number): UgctexLayout {
  switch (decompressedBytes) {
    case 131072:
      return { width: 512, height: 512, blockHeight: 16, format: 'Bc1', bytesPerBlock: 8 };
    case 98304:
      return { width: 384, height: 384, blockHeight: 16, format: 'Bc1', bytesPerBlock: 8 };
    case 65536:
      return { width: 256, height: 256, blockHeight: 8, format: 'Bc3', bytesPerBlock: 16 };
    default:
      throw new Error(
        `Unknown ugctex format: ${decompressedBytes} bytes. ` +
          `Known: 131072 (512x512 BC1), 98304 (384x384 BC1), 65536 (256x256 BC3).`,
      );
  }
}

type DecodedImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

export type Matte = { r: number; g: number; b: number; a: number };
export type Bc1Mode = 'auto' | 'fourColor' | 'threeColor';
export type Encoder = 'custom' | 'rgbcx';
type FitMode = 'fill' | 'contain' | 'cover';

function bc1ModeToEnum(mode: Bc1Mode): Bc1ModeEnum {
  switch (mode) {
    case 'auto':
      return Bc1ModeEnum.Auto;
    case 'fourColor':
      return Bc1ModeEnum.FourColor;
    case 'threeColor':
      return Bc1ModeEnum.ThreeColor;
  }
}

function fitModeToEnum(mode: FitMode): FitModeEnum {
  switch (mode) {
    case 'fill':
      return FitModeEnum.Fill;
    case 'contain':
      return FitModeEnum.Contain;
    case 'cover':
      return FitModeEnum.Cover;
  }
}

export async function decodeZsFile(name: string, bytes: Uint8Array): Promise<DecodedImage> {
  await ensureZstd();
  const wasm = await ensureUgcWasm();
  const raw = zstdDecompress(bytes);
  const kind = detectKind(name);
  if (kind === 'Thumb') return decodeThumb(wasm, raw);
  if (kind === 'Ugctex') return decodeUgctex(wasm, raw);
  return decodeCanvas(wasm, raw);
}

function decodeCanvas(wasm: UgcWasm, raw: Uint8Array): DecodedImage {
  if (raw.length % 4 !== 0) {
    throw new Error(`Canvas: byte length ${raw.length} not a multiple of 4`);
  }
  const totalPixels = raw.length / 4;
  const side = Math.floor(Math.sqrt(totalPixels));
  let width: number;
  let height: number;
  if (side * side === totalPixels) {
    width = side;
    height = side;
  } else if (totalPixels % 256 === 0) {
    width = 256;
    height = totalPixels / 256;
  } else {
    throw new Error(`Canvas: cannot determine dimensions for ${raw.length} bytes`);
  }
  const rgba = wasm.deswizzle(raw, width, height, 4, DEFAULT_BLOCK_HEIGHT);
  wasm.linearU8ToSrgbU8InPlace(rgba);
  return {
    width,
    height,
    rgba: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
  };
}

function decodeUgctex(wasm: UgcWasm, raw: Uint8Array): DecodedImage {
  const layout = detectUgctexLayout(raw.length);
  const visibleBlocksWide = layout.width / 4;
  const visibleBlocksTall = layout.height / 4;
  const blocks = wasm.deswizzle(
    raw,
    visibleBlocksWide,
    visibleBlocksTall,
    layout.bytesPerBlock,
    layout.blockHeight,
  );
  const rgba =
    layout.format === 'Bc3'
      ? wasm.bc3Decode(blocks, layout.width, layout.height)
      : wasm.bc1Decode(blocks, layout.width, layout.height);
  wasm.linearU8ToSrgbU8InPlace(rgba);
  return {
    width: layout.width,
    height: layout.height,
    rgba: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
  };
}

function decodeThumb(wasm: UgcWasm, raw: Uint8Array): DecodedImage {
  const totalBlocks = raw.length / 16;
  const gridSide = Math.floor(Math.sqrt(totalBlocks));
  if (gridSide * gridSide !== totalBlocks) {
    throw new Error(`Thumb: unexpected size ${raw.length}`);
  }
  const w = gridSide * 4;
  const h = gridSide * 4;
  const blocks = wasm.deswizzle(raw, gridSide, gridSide, 16, THUMB_BLOCK_HEIGHT);
  const rgba = wasm.bc3Decode(blocks, w, h);
  wasm.linearU8ToSrgbU8InPlace(rgba);
  return {
    width: w,
    height: h,
    rgba: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
  };
}

type EncodeOptions = {
  originalUgctex?: Uint8Array | null;
  encodeThumb?: boolean;
  fitMode?: FitMode;
  matte?: Matte | null;
  bc1Mode?: Bc1Mode;
  encoder?: Encoder;
};

type EncodeResult = {
  canvas: Uint8Array;
  ugctex: Uint8Array;
  thumb: Uint8Array | null;
};

export async function encodeFromRgba(
  source: { width: number; height: number; rgba: Uint8ClampedArray | Uint8Array },
  options: EncodeOptions = {},
): Promise<EncodeResult> {
  await ensureZstd();
  const wasm = await ensureUgcWasm();

  let originalSwizzled: Uint8Array | null = null;
  let layout: UgctexLayout = {
    width: 512,
    height: 512,
    blockHeight: 16,
    format: 'Bc1',
    bytesPerBlock: 8,
  };
  if (options.originalUgctex && options.originalUgctex.byteLength > 0) {
    try {
      originalSwizzled = zstdDecompress(options.originalUgctex);
      layout = detectUgctexLayout(originalSwizzled.length);
    } catch {
      originalSwizzled = null;
    }
  }

  const fitMode: FitMode = options.fitMode ?? 'cover';
  const matte = options.matte ?? null;
  const bc1Mode: Bc1Mode = options.bc1Mode ?? 'auto';
  const encoder: Encoder = options.encoder ?? 'custom';
  const fitEnum = fitModeToEnum(fitMode);
  const bc1Enum = bc1ModeToEnum(bc1Mode);

  const srcU8 =
    source.rgba instanceof Uint8Array
      ? source.rgba
      : new Uint8Array(source.rgba.buffer, source.rgba.byteOffset, source.rgba.byteLength);

  const canvasRgba = wasm.resize(srcU8, source.width, source.height, 256, 256, fitEnum, matte);
  const canvasLinearF = wasm.srgbToLinearF32(canvasRgba);
  const canvasLinearU8 = wasm.linearF32ToU8(canvasLinearF);
  const canvasSwizzled = wasm.swizzle(canvasLinearU8, 256, 256, 4, DEFAULT_BLOCK_HEIGHT, null);
  const canvas = zstdCompress(canvasSwizzled, ZSTD_LEVEL);

  const ugcRgba = wasm.resize(
    srcU8,
    source.width,
    source.height,
    layout.width,
    layout.height,
    fitEnum,
    matte,
  );
  const ugcLinearF = wasm.srgbToLinearF32(ugcRgba);
  const ugcBlocks = await bcEncodeWithFallback(
    wasm,
    layout.format,
    ugcLinearF,
    ugcRgba,
    layout.width,
    layout.height,
    encoder,
    bc1Enum,
  );
  const ugcSwizzled = wasm.swizzle(
    ugcBlocks,
    layout.width / 4,
    layout.height / 4,
    layout.bytesPerBlock,
    layout.blockHeight,
    originalSwizzled,
  );
  const ugctex = zstdCompress(ugcSwizzled, ZSTD_LEVEL);

  let thumb: Uint8Array | null = null;
  if (options.encodeThumb !== false) {
    const thumbBlocks = await bcEncodeWithFallback(
      wasm,
      'Bc3',
      canvasLinearF,
      canvasRgba,
      256,
      256,
      'custom',
    );
    const thumbSwizzled = wasm.swizzle(thumbBlocks, 64, 64, 16, THUMB_BLOCK_HEIGHT, null);
    thumb = zstdCompress(thumbSwizzled, ZSTD_LEVEL);
  }

  return { canvas, ugctex, thumb };
}

function cloneToArrayBuffer(view: ArrayBufferView): ArrayBuffer {
  const ab = new ArrayBuffer(view.byteLength);
  new Uint8Array(ab).set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
  return ab;
}

type PreviewOptions = {
  fitMode?: FitMode;
  matte?: Matte | null;
  bc1Mode?: Bc1Mode;
  encoder?: Encoder;
  originalUgctex?: Uint8Array | null;
};

export async function buildEncodedPreviewBlob(
  source: { width: number; height: number; rgba: Uint8ClampedArray | Uint8Array },
  options: PreviewOptions = {},
): Promise<Blob> {
  await ensureZstd();
  const wasm = await ensureUgcWasm();

  let layout: UgctexLayout = {
    width: 512,
    height: 512,
    blockHeight: 16,
    format: 'Bc1',
    bytesPerBlock: 8,
  };
  if (options.originalUgctex && options.originalUgctex.byteLength > 0) {
    try {
      const decompressed = zstdDecompress(options.originalUgctex);
      layout = detectUgctexLayout(decompressed.length);
    } catch {
      // keep default layout
    }
  }

  const fitMode: FitMode = options.fitMode ?? 'cover';
  const matte = options.matte ?? null;
  const bc1Mode: Bc1Mode = options.bc1Mode ?? 'auto';
  const encoder: Encoder = options.encoder ?? 'custom';

  const srcU8 =
    source.rgba instanceof Uint8Array
      ? source.rgba
      : new Uint8Array(source.rgba.buffer, source.rgba.byteOffset, source.rgba.byteLength);

  const resized = wasm.resize(
    srcU8,
    source.width,
    source.height,
    layout.width,
    layout.height,
    fitModeToEnum(fitMode),
    matte,
  );

  let pixels: Uint8Array;
  if (layout.format === 'Bc3') {
    pixels = resized;
  } else {
    const linearF = wasm.srgbToLinearF32(resized);
    const blocks = await bcEncodeWithFallback(
      wasm,
      layout.format,
      linearF,
      resized,
      layout.width,
      layout.height,
      encoder,
      bc1ModeToEnum(bc1Mode),
    );
    pixels = wasm.bc1Decode(blocks, layout.width, layout.height);
    wasm.linearU8ToSrgbU8InPlace(pixels);
  }

  const c = new OffscreenCanvas(layout.width, layout.height);
  const ctx = c.getContext('2d')!;
  const data = new ImageData(
    new Uint8ClampedArray(cloneToArrayBuffer(pixels)),
    layout.width,
    layout.height,
  );
  ctx.putImageData(data, 0, 0);
  return await c.convertToBlob({ type: 'image/png' });
}

const MAX_SOURCE_SIDE = 1024;

export async function pngFileToRgba(
  file: File | Blob,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray }> {
  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_SOURCE_SIDE ? MAX_SOURCE_SIDE / longest : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    return { width: data.width, height: data.height, rgba: data.data };
  } finally {
    bitmap.close();
  }
}

type RgbaSource = { width: number; height: number; rgba: Uint8ClampedArray | Uint8Array };
type RgbaImage = { width: number; height: number; rgba: Uint8ClampedArray };

export function rotateRgbaCw(src: RgbaSource): RgbaImage {
  const { width: w, height: h } = src;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let nx = 0; nx < h; nx++) {
    for (let ny = 0; ny < w; ny++) {
      const ox = ny;
      const oy = h - 1 - nx;
      const srcOff = (oy * w + ox) * 4;
      const dstOff = (ny * h + nx) * 4;
      out[dstOff] = src.rgba[srcOff];
      out[dstOff + 1] = src.rgba[srcOff + 1];
      out[dstOff + 2] = src.rgba[srcOff + 2];
      out[dstOff + 3] = src.rgba[srcOff + 3];
    }
  }
  return { width: h, height: w, rgba: out };
}

export function rotateRgbaCcw(src: RgbaSource): RgbaImage {
  const { width: w, height: h } = src;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let nx = 0; nx < h; nx++) {
    for (let ny = 0; ny < w; ny++) {
      const ox = w - 1 - ny;
      const oy = nx;
      const srcOff = (oy * w + ox) * 4;
      const dstOff = (ny * h + nx) * 4;
      out[dstOff] = src.rgba[srcOff];
      out[dstOff + 1] = src.rgba[srcOff + 1];
      out[dstOff + 2] = src.rgba[srcOff + 2];
      out[dstOff + 3] = src.rgba[srcOff + 3];
    }
  }
  return { width: h, height: w, rgba: out };
}

export function flipRgbaH(src: RgbaSource): RgbaImage {
  const { width: w, height: h } = src;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcOff = (y * w + (w - 1 - x)) * 4;
      const dstOff = (y * w + x) * 4;
      out[dstOff] = src.rgba[srcOff];
      out[dstOff + 1] = src.rgba[srcOff + 1];
      out[dstOff + 2] = src.rgba[srcOff + 2];
      out[dstOff + 3] = src.rgba[srcOff + 3];
    }
  }
  return { width: w, height: h, rgba: out };
}

export function flipRgbaV(src: RgbaSource): RgbaImage {
  const { width: w, height: h } = src;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcOff = ((h - 1 - y) * w + x) * 4;
      const dstOff = (y * w + x) * 4;
      out[dstOff] = src.rgba[srcOff];
      out[dstOff + 1] = src.rgba[srcOff + 1];
      out[dstOff + 2] = src.rgba[srcOff + 2];
      out[dstOff + 3] = src.rgba[srcOff + 3];
    }
  }
  return { width: w, height: h, rgba: out };
}

export async function rgbaToPngBlob(img: DecodedImage): Promise<Blob> {
  const c = new OffscreenCanvas(img.width, img.height);
  const ctx = c.getContext('2d')!;
  const data = new ImageData(
    new Uint8ClampedArray(cloneToArrayBuffer(img.rgba)),
    img.width,
    img.height,
  );
  ctx.putImageData(data, 0, 0);
  return await c.convertToBlob({ type: 'image/png' });
}
