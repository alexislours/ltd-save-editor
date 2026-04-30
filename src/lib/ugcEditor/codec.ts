import {
  compress as zstdCompress,
  decompress as zstdDecompress,
  init as zstdInit,
} from '@bokuweb/zstd-wasm';

export type TextureKind = 'Canvas' | 'Ugctex' | 'Thumb';
export type TextureFormat = 'Bc1' | 'Bc3';

export type UgctexLayout = {
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

export async function initCodec(): Promise<void> {
  await ensureZstd();
}

export function detectKind(fileName: string): TextureKind {
  const lower = fileName.toLowerCase();
  if (lower.includes('thumb')) return 'Thumb';
  if (lower.includes('ugctex')) return 'Ugctex';
  return 'Canvas';
}

export function detectUgctexLayout(decompressedBytes: number): UgctexLayout {
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

export type DecodedImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

export async function decodeZsFile(name: string, bytes: Uint8Array): Promise<DecodedImage> {
  await ensureZstd();
  const raw = zstdDecompress(bytes);
  const kind = detectKind(name);
  if (kind === 'Thumb') return decodeThumb(raw);
  if (kind === 'Ugctex') return decodeUgctex(raw);
  return decodeCanvas(raw);
}

function decodeCanvas(raw: Uint8Array): DecodedImage {
  const totalPixels = raw.length / 4;
  const side = Math.floor(Math.sqrt(totalPixels));
  let width: number;
  let height: number;
  if (side * side === totalPixels) {
    width = side;
    height = side;
  } else {
    width = 256;
    height = totalPixels / width;
  }
  const expected = width * height * 4;
  if (raw.length !== expected) {
    throw new Error(`Canvas: unexpected size ${raw.length}, want ${expected}`);
  }
  const rgba = deswizzleBlockLinear(raw, width, height, 4, DEFAULT_BLOCK_HEIGHT);
  convertLinearToSrgb(rgba);
  return {
    width,
    height,
    rgba: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
  };
}

function decodeUgctex(raw: Uint8Array): DecodedImage {
  const layout = detectUgctexLayout(raw.length);
  const visibleBlocksWide = layout.width / 4;
  const visibleBlocksTall = layout.height / 4;
  const blocks = deswizzleBlockLinear(
    raw,
    visibleBlocksWide,
    visibleBlocksTall,
    layout.bytesPerBlock,
    layout.blockHeight,
  );
  const rgba =
    layout.format === 'Bc3'
      ? bc3Decode(blocks, layout.width, layout.height)
      : bc1Decode(blocks, layout.width, layout.height);
  convertLinearToSrgb(rgba);
  return {
    width: layout.width,
    height: layout.height,
    rgba: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
  };
}

function decodeThumb(raw: Uint8Array): DecodedImage {
  const totalBlocks = raw.length / 16;
  const gridSide = Math.floor(Math.sqrt(totalBlocks));
  if (gridSide * gridSide !== totalBlocks) {
    throw new Error(`Thumb: unexpected size ${raw.length}`);
  }
  const w = gridSide * 4;
  const h = gridSide * 4;
  const blocks = deswizzleBlockLinear(raw, gridSide, gridSide, 16, THUMB_BLOCK_HEIGHT);
  const rgba = bc3Decode(blocks, w, h);
  convertLinearToSrgb(rgba);
  return {
    width: w,
    height: h,
    rgba: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
  };
}

export type FitMode = 'fill' | 'contain' | 'cover';

export type Matte = { r: number; g: number; b: number; a: number };

export type EncodeOptions = {
  originalUgctex?: Uint8Array | null;
  encodeThumb?: boolean;
  fitMode?: FitMode;
  matte?: Matte | null;
};

export type EncodeResult = {
  canvas: Uint8Array;
  ugctex: Uint8Array;
  thumb: Uint8Array | null;
};

export async function encodeFromRgba(
  source: { width: number; height: number; rgba: Uint8ClampedArray | Uint8Array },
  options: EncodeOptions = {},
): Promise<EncodeResult> {
  await ensureZstd();

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

  const canvasRgba = resizeRgba(source, 256, 256, fitMode, matte);
  convertSrgbToLinear(canvasRgba);
  const canvasSwizzled = swizzleBlockLinear(canvasRgba, 256, 256, 4, DEFAULT_BLOCK_HEIGHT, null);
  const canvas = zstdCompress(canvasSwizzled, ZSTD_LEVEL);

  const ugcRgba = resizeRgba(source, layout.width, layout.height, fitMode, matte);
  convertSrgbToLinear(ugcRgba);
  const ugcBlocks =
    layout.format === 'Bc3'
      ? bc3Encode(ugcRgba, layout.width, layout.height)
      : bc1Encode(ugcRgba, layout.width, layout.height);
  const ugcSwizzled = swizzleBlockLinear(
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
    const thumbRgba = resizeRgba(source, 256, 256, fitMode, matte);
    convertSrgbToLinear(thumbRgba);
    const thumbBlocks = bc3Encode(thumbRgba, 256, 256);
    const thumbSwizzled = swizzleBlockLinear(thumbBlocks, 64, 64, 16, THUMB_BLOCK_HEIGHT, null);
    thumb = zstdCompress(thumbSwizzled, ZSTD_LEVEL);
  }

  return { canvas, ugctex, thumb };
}

function cloneToArrayBuffer(view: ArrayBufferView): ArrayBuffer {
  const ab = new ArrayBuffer(view.byteLength);
  new Uint8Array(ab).set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
  return ab;
}

function resizeRgba(
  src: { width: number; height: number; rgba: Uint8ClampedArray | Uint8Array },
  targetW: number,
  targetH: number,
  fitMode: FitMode = 'cover',
  matte: Matte | null = null,
): Uint8Array {
  const srcAB = cloneToArrayBuffer(src.rgba);
  if (src.width === targetW && src.height === targetH && fitMode !== 'contain') {
    return new Uint8Array(srcAB);
  }
  const srcCanvas = new OffscreenCanvas(src.width, src.height);
  const sctx = srcCanvas.getContext('2d')!;
  const srcImg = new ImageData(new Uint8ClampedArray(srcAB), src.width, src.height);
  sctx.putImageData(srcImg, 0, 0);

  const dst = new OffscreenCanvas(targetW, targetH);
  const dctx = dst.getContext('2d')!;
  dctx.imageSmoothingEnabled = true;
  dctx.imageSmoothingQuality = 'high';

  if (fitMode === 'fill') {
    dctx.drawImage(srcCanvas, 0, 0, src.width, src.height, 0, 0, targetW, targetH);
  } else if (fitMode === 'contain') {
    const scale = Math.min(targetW / src.width, targetH / src.height);
    const drawW = src.width * scale;
    const drawH = src.height * scale;
    const dx = (targetW - drawW) / 2;
    const dy = (targetH - drawH) / 2;
    if (matte && matte.a > 0) {
      dctx.fillStyle = `rgba(${matte.r}, ${matte.g}, ${matte.b}, ${matte.a / 255})`;
      dctx.fillRect(0, 0, targetW, targetH);
    } else {
      dctx.clearRect(0, 0, targetW, targetH);
    }
    dctx.drawImage(srcCanvas, 0, 0, src.width, src.height, dx, dy, drawW, drawH);
  } else {
    const scale = Math.max(targetW / src.width, targetH / src.height);
    const cropW = targetW / scale;
    const cropH = targetH / scale;
    const sx = (src.width - cropW) / 2;
    const sy = (src.height - cropH) / 2;
    dctx.drawImage(srcCanvas, sx, sy, cropW, cropH, 0, 0, targetW, targetH);
  }

  const out = dctx.getImageData(0, 0, targetW, targetH).data;
  return new Uint8Array(cloneToArrayBuffer(out));
}

export async function buildFitPreviewBlob(
  src: { width: number; height: number; rgba: Uint8ClampedArray | Uint8Array },
  targetSize: number,
  fitMode: FitMode,
  matte: Matte | null = null,
): Promise<Blob> {
  const resized = resizeRgba(src, targetSize, targetSize, fitMode, matte);
  const c = new OffscreenCanvas(targetSize, targetSize);
  const ctx = c.getContext('2d')!;
  const data = new ImageData(
    new Uint8ClampedArray(cloneToArrayBuffer(resized)),
    targetSize,
    targetSize,
  );
  ctx.putImageData(data, 0, 0);
  return await c.convertToBlob({ type: 'image/png' });
}

const SRGB_TO_LINEAR = buildSrgbToLinearLut();
const LINEAR_TO_SRGB = buildLinearToSrgbLut();

function buildSrgbToLinearLut(): Uint8Array {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const s = i / 255;
    const lin = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    lut[i] = Math.max(0, Math.min(255, Math.round(lin * 255)));
  }
  return lut;
}

function buildLinearToSrgbLut(): Uint8Array {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const lin = i / 255;
    const s = lin <= 0.0031308 ? lin * 12.92 : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055;
    lut[i] = Math.max(0, Math.min(255, Math.round(s * 255)));
  }
  return lut;
}

function convertSrgbToLinear(rgba: Uint8Array): void {
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = SRGB_TO_LINEAR[rgba[i]];
    rgba[i + 1] = SRGB_TO_LINEAR[rgba[i + 1]];
    rgba[i + 2] = SRGB_TO_LINEAR[rgba[i + 2]];
  }
}

function convertLinearToSrgb(rgba: Uint8Array): void {
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = LINEAR_TO_SRGB[rgba[i]];
    rgba[i + 1] = LINEAR_TO_SRGB[rgba[i + 1]];
    rgba[i + 2] = LINEAR_TO_SRGB[rgba[i + 2]];
  }
}

function divRoundUp(n: number, d: number): number {
  return Math.floor((n + d - 1) / d);
}

function gobAddress(
  x: number,
  y: number,
  widthInGobs: number,
  bpe: number,
  blockHeight: number,
): number {
  const xBytes = x * bpe;
  const gobAddr =
    Math.floor(y / (8 * blockHeight)) * 512 * blockHeight * widthInGobs +
    Math.floor(xBytes / 64) * 512 * blockHeight +
    Math.floor((y % (8 * blockHeight)) / 8) * 512;
  const xInGob = xBytes % 64;
  const yInGob = y % 8;
  return (
    gobAddr +
    Math.floor((xInGob % 64) / 32) * 256 +
    Math.floor((yInGob % 8) / 2) * 64 +
    Math.floor((xInGob % 32) / 16) * 32 +
    (yInGob % 2) * 16 +
    (xInGob % 16)
  );
}

function deswizzleBlockLinear(
  data: Uint8Array,
  width: number,
  height: number,
  bpe: number,
  blockHeight: number,
): Uint8Array {
  const widthInGobs = divRoundUp(width * bpe, 64);
  const paddedHeight = divRoundUp(height, 8 * blockHeight) * (8 * blockHeight);
  const paddedSize = widthInGobs * paddedHeight * 64;
  let source: Uint8Array;
  if (data.length >= paddedSize) {
    source = data;
  } else {
    source = new Uint8Array(paddedSize);
    source.set(data);
  }
  const output = new Uint8Array(width * height * bpe);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const swizzled = gobAddress(x, y, widthInGobs, bpe, blockHeight);
      const linear = (y * width + x) * bpe;
      output.set(source.subarray(swizzled, swizzled + bpe), linear);
    }
  }
  return output;
}

function swizzleBlockLinear(
  data: Uint8Array,
  width: number,
  height: number,
  bpe: number,
  blockHeight: number,
  baseBuffer: Uint8Array | null,
): Uint8Array {
  const widthInGobs = divRoundUp(width * bpe, 64);
  const paddedHeight = divRoundUp(height, 8 * blockHeight) * (8 * blockHeight);
  const paddedSize = widthInGobs * paddedHeight * 64;
  let output: Uint8Array;
  if (baseBuffer && baseBuffer.length === paddedSize) {
    output = new Uint8Array(baseBuffer);
  } else {
    output = new Uint8Array(paddedSize);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const linear = (y * width + x) * bpe;
      const swizzled = gobAddress(x, y, widthInGobs, bpe, blockHeight);
      output.set(data.subarray(linear, linear + bpe), swizzled);
    }
  }
  return output;
}

function rgb565Decode(c: number): [number, number, number] {
  const r = Math.floor((((c >> 11) & 0x1f) * 255) / 31);
  const g = Math.floor((((c >> 5) & 0x3f) * 255) / 63);
  const b = Math.floor(((c & 0x1f) * 255) / 31);
  return [r, g, b];
}

function rgb565Encode(r: number, g: number, b: number): number {
  const r5 = Math.floor((r * 31 + 127) / 255);
  const g6 = Math.floor((g * 63 + 127) / 255);
  const b5 = Math.floor((b * 31 + 127) / 255);
  return ((r5 << 11) | (g6 << 5) | b5) & 0xffff;
}

function bc1Decode(blockData: Uint8Array, texW: number, texH: number): Uint8Array {
  const blocksX = texW / 4;
  const blocksY = texH / 4;
  const out = new Uint8Array(texW * texH * 4);
  const palette = new Uint8Array(16);
  const view = new DataView(blockData.buffer, blockData.byteOffset, blockData.byteLength);
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const off = (by * blocksX + bx) * 8;
      const c0 = view.getUint16(off, true);
      const c1 = view.getUint16(off + 2, true);
      const indices = view.getUint32(off + 4, true);
      const [r0, g0, b0] = rgb565Decode(c0);
      const [r1, g1, b1] = rgb565Decode(c1);
      palette[0] = r0;
      palette[1] = g0;
      palette[2] = b0;
      palette[3] = 255;
      palette[4] = r1;
      palette[5] = g1;
      palette[6] = b1;
      palette[7] = 255;
      if (c0 > c1) {
        palette[8] = (2 * r0 + r1) / 3;
        palette[9] = (2 * g0 + g1) / 3;
        palette[10] = (2 * b0 + b1) / 3;
        palette[11] = 255;
        palette[12] = (r0 + 2 * r1) / 3;
        palette[13] = (g0 + 2 * g1) / 3;
        palette[14] = (b0 + 2 * b1) / 3;
        palette[15] = 255;
      } else {
        palette[8] = (r0 + r1) >> 1;
        palette[9] = (g0 + g1) >> 1;
        palette[10] = (b0 + b1) >> 1;
        palette[11] = 255;
        palette[12] = 0;
        palette[13] = 0;
        palette[14] = 0;
        palette[15] = 0;
      }
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const idx = (indices >>> (2 * (row * 4 + col))) & 0x3;
          const px = bx * 4 + col;
          const py = by * 4 + row;
          const dst = (py * texW + px) * 4;
          const palOff = idx * 4;
          out[dst] = palette[palOff];
          out[dst + 1] = palette[palOff + 1];
          out[dst + 2] = palette[palOff + 2];
          out[dst + 3] = palette[palOff + 3];
        }
      }
    }
  }
  return out;
}

function colorDistSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

function bc1Encode(rgba: Uint8Array, texW: number, texH: number): Uint8Array {
  const blocksX = texW / 4;
  const blocksY = texH / 4;
  const out = new Uint8Array(blocksX * blocksY * 8);
  const block = new Uint8Array(64);
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let hasAlpha = false;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const px = bx * 4 + col;
          const py = by * 4 + row;
          const src = (py * texW + px) * 4;
          const dst = (row * 4 + col) * 4;
          block[dst] = rgba[src];
          block[dst + 1] = rgba[src + 1];
          block[dst + 2] = rgba[src + 2];
          block[dst + 3] = rgba[src + 3];
          if (rgba[src + 3] < 128) hasAlpha = true;
        }
      }
      bc1EncodeBlock(block, hasAlpha, out, (by * blocksX + bx) * 8);
    }
  }
  return out;
}

function bc1EncodeBlock(
  block: Uint8Array,
  hasAlpha: boolean,
  output: Uint8Array,
  outOffset: number,
): void {
  let minR = 255,
    minG = 255,
    minB = 255,
    maxR = 0,
    maxG = 0,
    maxB = 0,
    opaqueCount = 0;
  for (let i = 0; i < 16; i++) {
    const off = i * 4;
    if (block[off + 3] < 128) continue;
    opaqueCount++;
    const r = block[off],
      g = block[off + 1],
      b = block[off + 2];
    if (r < minR) minR = r;
    if (g < minG) minG = g;
    if (b < minB) minB = b;
    if (r > maxR) maxR = r;
    if (g > maxG) maxG = g;
    if (b > maxB) maxB = b;
  }
  if (opaqueCount === 0) {
    output[outOffset] = 0;
    output[outOffset + 1] = 0;
    output[outOffset + 2] = 0;
    output[outOffset + 3] = 0;
    output[outOffset + 4] = 0xff;
    output[outOffset + 5] = 0xff;
    output[outOffset + 6] = 0xff;
    output[outOffset + 7] = 0xff;
    return;
  }
  let c0 = rgb565Encode(maxR, maxG, maxB);
  let c1 = rgb565Encode(minR, minG, minB);
  if (hasAlpha) {
    if (c0 > c1) [c0, c1] = [c1, c0];
  } else {
    if (c0 < c1) [c0, c1] = [c1, c0];
    if (c0 === c1) {
      if (c0 < 0xffff) c0++;
      else c1--;
    }
  }
  const [r0, g0, b0] = rgb565Decode(c0);
  const [r1, g1, b1] = rgb565Decode(c1);
  let pr2: number, pg2: number, pb2: number, pr3: number, pg3: number, pb3: number;
  let idx3IsTransparent: boolean;
  if (c0 > c1) {
    pr2 = (2 * r0 + r1) / 3;
    pg2 = (2 * g0 + g1) / 3;
    pb2 = (2 * b0 + b1) / 3;
    pr3 = (r0 + 2 * r1) / 3;
    pg3 = (g0 + 2 * g1) / 3;
    pb3 = (b0 + 2 * b1) / 3;
    idx3IsTransparent = false;
  } else {
    pr2 = (r0 + r1) / 2;
    pg2 = (g0 + g1) / 2;
    pb2 = (b0 + b1) / 2;
    pr3 = 0;
    pg3 = 0;
    pb3 = 0;
    idx3IsTransparent = true;
  }
  let indices = 0;
  for (let i = 0; i < 16; i++) {
    const off = i * 4;
    const r = block[off],
      g = block[off + 1],
      b = block[off + 2],
      a = block[off + 3];
    let bestIdx: number;
    if (a < 128 && idx3IsTransparent) {
      bestIdx = 3;
    } else {
      const d0 = colorDistSq(r, g, b, r0, g0, b0);
      const d1 = colorDistSq(r, g, b, r1, g1, b1);
      const d2 = colorDistSq(r, g, b, pr2, pg2, pb2);
      bestIdx = 0;
      let bestDist = d0;
      if (d1 < bestDist) {
        bestDist = d1;
        bestIdx = 1;
      }
      if (d2 < bestDist) {
        bestDist = d2;
        bestIdx = 2;
      }
      if (!idx3IsTransparent) {
        const d3 = colorDistSq(r, g, b, pr3, pg3, pb3);
        if (d3 < bestDist) bestIdx = 3;
      }
    }
    indices = (indices | (bestIdx << (2 * i))) >>> 0;
  }
  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
  view.setUint16(outOffset, c0, true);
  view.setUint16(outOffset + 2, c1, true);
  view.setUint32(outOffset + 4, indices, true);
}

function bc3Decode(blockData: Uint8Array, texW: number, texH: number): Uint8Array {
  const blocksX = texW / 4;
  const blocksY = texH / 4;
  const out = new Uint8Array(texW * texH * 4);
  const alphas = new Uint8Array(8);
  const view = new DataView(blockData.buffer, blockData.byteOffset, blockData.byteLength);
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const off = (by * blocksX + bx) * 16;
      const a0 = blockData[off];
      const a1 = blockData[off + 1];
      let alphaIdxBits = 0n;
      for (let i = 0; i < 6; i++) alphaIdxBits |= BigInt(blockData[off + 2 + i]) << BigInt(8 * i);
      alphas[0] = a0;
      alphas[1] = a1;
      if (a0 > a1) {
        alphas[2] = (6 * a0 + 1 * a1) / 7;
        alphas[3] = (5 * a0 + 2 * a1) / 7;
        alphas[4] = (4 * a0 + 3 * a1) / 7;
        alphas[5] = (3 * a0 + 4 * a1) / 7;
        alphas[6] = (2 * a0 + 5 * a1) / 7;
        alphas[7] = (1 * a0 + 6 * a1) / 7;
      } else {
        alphas[2] = (4 * a0 + 1 * a1) / 5;
        alphas[3] = (3 * a0 + 2 * a1) / 5;
        alphas[4] = (2 * a0 + 3 * a1) / 5;
        alphas[5] = (1 * a0 + 4 * a1) / 5;
        alphas[6] = 0;
        alphas[7] = 255;
      }
      const c0 = view.getUint16(off + 8, true);
      const c1 = view.getUint16(off + 10, true);
      const colorIndices = view.getUint32(off + 12, true);
      const [r0, g0, b0] = rgb565Decode(c0);
      const [r1, g1, b1] = rgb565Decode(c1);
      const pr2 = (2 * r0 + r1) / 3;
      const pg2 = (2 * g0 + g1) / 3;
      const pb2 = (2 * b0 + b1) / 3;
      const pr3 = (r0 + 2 * r1) / 3;
      const pg3 = (g0 + 2 * g1) / 3;
      const pb3 = (b0 + 2 * b1) / 3;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const pi = row * 4 + col;
          const ci = (colorIndices >>> (2 * pi)) & 0x3;
          const ai = Number((alphaIdxBits >> BigInt(3 * pi)) & 0x7n);
          const px = bx * 4 + col;
          const py = by * 4 + row;
          const dst = (py * texW + px) * 4;
          let r: number, g: number, b: number;
          switch (ci) {
            case 0:
              r = r0;
              g = g0;
              b = b0;
              break;
            case 1:
              r = r1;
              g = g1;
              b = b1;
              break;
            case 2:
              r = pr2;
              g = pg2;
              b = pb2;
              break;
            default:
              r = pr3;
              g = pg3;
              b = pb3;
              break;
          }
          out[dst] = r;
          out[dst + 1] = g;
          out[dst + 2] = b;
          out[dst + 3] = alphas[ai];
        }
      }
    }
  }
  return out;
}

function bc3Encode(rgba: Uint8Array, texW: number, texH: number): Uint8Array {
  const blocksX = texW / 4;
  const blocksY = texH / 4;
  const out = new Uint8Array(blocksX * blocksY * 16);
  const block = new Uint8Array(64);
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const px = bx * 4 + col;
          const py = by * 4 + row;
          const src = (py * texW + px) * 4;
          const dst = (row * 4 + col) * 4;
          block[dst] = rgba[src];
          block[dst + 1] = rgba[src + 1];
          block[dst + 2] = rgba[src + 2];
          block[dst + 3] = rgba[src + 3];
        }
      }
      bc3EncodeBlock(block, out, (by * blocksX + bx) * 16);
    }
  }
  return out;
}

function bc3EncodeBlock(block: Uint8Array, output: Uint8Array, outOffset: number): void {
  let minA = 255,
    maxA = 0;
  for (let i = 0; i < 16; i++) {
    const a = block[i * 4 + 3];
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
  }
  let a0: number, a1: number;
  if (minA === maxA) {
    a0 = maxA;
    a1 = maxA;
  } else {
    a0 = maxA;
    a1 = minA;
  }
  output[outOffset] = a0;
  output[outOffset + 1] = a1;
  const alphaPal = new Int32Array(8);
  alphaPal[0] = a0;
  alphaPal[1] = a1;
  if (a0 > a1) {
    alphaPal[2] = (6 * a0 + 1 * a1) / 7;
    alphaPal[3] = (5 * a0 + 2 * a1) / 7;
    alphaPal[4] = (4 * a0 + 3 * a1) / 7;
    alphaPal[5] = (3 * a0 + 4 * a1) / 7;
    alphaPal[6] = (2 * a0 + 5 * a1) / 7;
    alphaPal[7] = (1 * a0 + 6 * a1) / 7;
  } else {
    alphaPal[2] = a0;
    alphaPal[3] = a0;
    alphaPal[4] = a0;
    alphaPal[5] = a0;
    alphaPal[6] = 0;
    alphaPal[7] = 255;
  }
  let alphaIdxBits = 0n;
  for (let i = 0; i < 16; i++) {
    const a = block[i * 4 + 3];
    let bestIdx = 0;
    let bestDist = Math.abs(a - alphaPal[0]);
    for (let p = 1; p < 8; p++) {
      const d = Math.abs(a - alphaPal[p]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = p;
      }
    }
    alphaIdxBits |= BigInt(bestIdx) << BigInt(3 * i);
  }
  for (let i = 0; i < 6; i++) {
    output[outOffset + 2 + i] = Number((alphaIdxBits >> BigInt(8 * i)) & 0xffn);
  }
  let minR = 255,
    minG = 255,
    minB = 255,
    maxR = 0,
    maxG = 0,
    maxB = 0;
  for (let i = 0; i < 16; i++) {
    const off = i * 4;
    const r = block[off],
      g = block[off + 1],
      b = block[off + 2];
    if (r < minR) minR = r;
    if (g < minG) minG = g;
    if (b < minB) minB = b;
    if (r > maxR) maxR = r;
    if (g > maxG) maxG = g;
    if (b > maxB) maxB = b;
  }
  let c0 = rgb565Encode(maxR, maxG, maxB);
  let c1 = rgb565Encode(minR, minG, minB);
  if (c0 < c1) [c0, c1] = [c1, c0];
  if (c0 === c1) {
    if (c0 < 0xffff) c0++;
    else c1--;
  }
  const [r0, g0, b0] = rgb565Decode(c0);
  const [r1, g1, b1] = rgb565Decode(c1);
  const pr2 = (2 * r0 + r1) / 3,
    pg2 = (2 * g0 + g1) / 3,
    pb2 = (2 * b0 + b1) / 3;
  const pr3 = (r0 + 2 * r1) / 3,
    pg3 = (g0 + 2 * g1) / 3,
    pb3 = (b0 + 2 * b1) / 3;
  let colorIndices = 0;
  for (let i = 0; i < 16; i++) {
    const off = i * 4;
    const r = block[off],
      g = block[off + 1],
      b = block[off + 2];
    const d0 = colorDistSq(r, g, b, r0, g0, b0);
    const d1 = colorDistSq(r, g, b, r1, g1, b1);
    const d2 = colorDistSq(r, g, b, pr2, pg2, pb2);
    const d3 = colorDistSq(r, g, b, pr3, pg3, pb3);
    let bestIdx = 0;
    let bestDist = d0;
    if (d1 < bestDist) {
      bestDist = d1;
      bestIdx = 1;
    }
    if (d2 < bestDist) {
      bestDist = d2;
      bestIdx = 2;
    }
    if (d3 < bestDist) bestIdx = 3;
    colorIndices = (colorIndices | (bestIdx << (2 * i))) >>> 0;
  }
  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
  view.setUint16(outOffset + 8, c0, true);
  view.setUint16(outOffset + 10, c1, true);
  view.setUint32(outOffset + 12, colorIndices, true);
}

export async function pngFileToRgba(
  file: File | Blob,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray }> {
  const bitmap = await createImageBitmap(file);
  try {
    const c = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
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
