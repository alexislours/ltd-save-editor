import { Bc1Mode, FitMode, type Matte } from './types';
import { bc1EncodeThreaded, bc3EncodeThreaded } from './threadPool';
import { loadWasmBytes } from './wasmLoader';

interface UgcWasmExports {
  memory: WebAssembly.Memory;
  alloc(size: number): number;
  mark(): number;
  release(m: number): void;
  free(ptr: number): void;
  deswizzleBlockLinear(
    srcPtr: number,
    srcLen: number,
    dstPtr: number,
    width: number,
    height: number,
    bpe: number,
    blockHeight: number,
  ): void;
  swizzleBlockLinear(
    srcPtr: number,
    srcLen: number,
    dstPtr: number,
    dstLen: number,
    width: number,
    height: number,
    bpe: number,
    blockHeight: number,
    basePtr: number,
    baseLen: number,
  ): void;
  srgbU8ToLinearF32(srcPtr: number, dstPtr: number, pixelCount: number): void;
  linearF32ToLinearU8(srcPtr: number, dstPtr: number, count: number): void;
  convertLinearU8ToSrgbU8(rgbaPtr: number, byteLen: number): void;
  bc1Decode(blocksPtr: number, dstPtr: number, texW: number, texH: number): void;
  bc3Decode(blocksPtr: number, dstPtr: number, texW: number, texH: number): void;
  bc1Encode(
    linRgbaPtr: number,
    srgbRgbaPtr: number,
    dstPtr: number,
    texW: number,
    texH: number,
    bc1Mode: number,
  ): void;
  bc1EncodeRgbcx(linRgbaPtr: number, dstPtr: number, texW: number, texH: number): void;
  bc3Encode(
    linRgbaPtr: number,
    srgbRgbaPtr: number,
    dstPtr: number,
    texW: number,
    texH: number,
  ): void;
  resizeRgba(
    srcPtr: number,
    srcW: number,
    srcH: number,
    dstPtr: number,
    dstW: number,
    dstH: number,
    fitMode: number,
    matteR: number,
    matteG: number,
    matteB: number,
    matteA: number,
  ): void;
}

export interface UgcWasm {
  bc1Decode(blocks: Uint8Array, w: number, h: number): Uint8Array;
  bc3Decode(blocks: Uint8Array, w: number, h: number): Uint8Array;
  bc1Encode(
    linRgba: Float32Array,
    srgbRgba: Uint8Array,
    w: number,
    h: number,
    mode: Bc1Mode,
  ): Uint8Array;
  bc1EncodeRgbcx(linRgba: Float32Array, w: number, h: number): Uint8Array;
  bc3Encode(linRgba: Float32Array, srgbRgba: Uint8Array, w: number, h: number): Uint8Array;
  bc1EncodeThreaded(
    linRgba: Float32Array,
    srgbRgba: Uint8Array,
    w: number,
    h: number,
    mode: Bc1Mode,
    threads: number,
  ): Promise<Uint8Array>;
  bc3EncodeThreaded(
    linRgba: Float32Array,
    srgbRgba: Uint8Array,
    w: number,
    h: number,
    threads: number,
  ): Promise<Uint8Array>;
  deswizzle(
    swizzled: Uint8Array,
    width: number,
    height: number,
    bpe: number,
    blockHeight: number,
  ): Uint8Array;
  swizzle(
    linear: Uint8Array,
    width: number,
    height: number,
    bpe: number,
    blockHeight: number,
    base: Uint8Array | null,
  ): Uint8Array;
  srgbToLinearF32(rgba: Uint8Array): Float32Array;
  linearF32ToU8(linear: Float32Array): Uint8Array;
  linearU8ToSrgbU8InPlace(rgba: Uint8Array): void;
  resize(
    rgba: Uint8Array,
    srcW: number,
    srcH: number,
    dstW: number,
    dstH: number,
    fit: FitMode,
    matte: Matte | null,
  ): Uint8Array;
}

function divRoundUp(n: number, d: number): number {
  return Math.floor((n + d - 1) / d);
}

function paddedSwizzleSize(
  width: number,
  height: number,
  bpe: number,
  blockHeight: number,
): number {
  const widthInGobs = divRoundUp(width * bpe, 64);
  const paddedHeight = divRoundUp(height, 8 * blockHeight) * (8 * blockHeight);
  return widthInGobs * paddedHeight * 64;
}

async function loadWasm(): Promise<WebAssembly.Instance> {
  const bytes = await loadWasmBytes();
  const result = await WebAssembly.instantiate(bytes, importObject);
  return result.instance;
}

const importObject: WebAssembly.Imports = {
  env: {
    abort() {
      throw new Error('ugc.wasm aborted');
    },
  },
};

function makeWasm(instance: WebAssembly.Instance): UgcWasm {
  const exports = instance.exports as unknown as UgcWasmExports;
  const memory = exports.memory;

  function u8(ptr: number, len: number): Uint8Array {
    return new Uint8Array(memory.buffer, ptr, len);
  }
  function f32(ptr: number, len: number): Float32Array {
    return new Float32Array(memory.buffer, ptr, len);
  }

  return {
    bc1Decode(blocks, w, h) {
      const m = exports.mark();
      try {
        const inLen = blocks.byteLength;
        const outLen = w * h * 4;
        const inPtr = exports.alloc(inLen);
        const outPtr = exports.alloc(outLen);
        u8(inPtr, inLen).set(blocks);
        exports.bc1Decode(inPtr, outPtr, w, h);
        const out = new Uint8Array(outLen);
        out.set(u8(outPtr, outLen));
        return out;
      } finally {
        exports.release(m);
      }
    },
    bc3Decode(blocks, w, h) {
      const m = exports.mark();
      try {
        const inLen = blocks.byteLength;
        const outLen = w * h * 4;
        const inPtr = exports.alloc(inLen);
        const outPtr = exports.alloc(outLen);
        u8(inPtr, inLen).set(blocks);
        exports.bc3Decode(inPtr, outPtr, w, h);
        const out = new Uint8Array(outLen);
        out.set(u8(outPtr, outLen));
        return out;
      } finally {
        exports.release(m);
      }
    },
    bc1Encode(linRgba, srgbRgba, w, h, mode) {
      const m = exports.mark();
      try {
        const pixels = w * h;
        const linLen = pixels * 16;
        const srgbLen = pixels * 4;
        const outLen = (pixels / 16) * 8;
        const linPtr = exports.alloc(linLen);
        const srgbPtr = exports.alloc(srgbLen);
        const outPtr = exports.alloc(outLen);
        f32(linPtr, pixels * 4).set(linRgba);
        u8(srgbPtr, srgbLen).set(srgbRgba);
        exports.bc1Encode(linPtr, srgbPtr, outPtr, w, h, mode);
        const out = new Uint8Array(outLen);
        out.set(u8(outPtr, outLen));
        return out;
      } finally {
        exports.release(m);
      }
    },
    bc1EncodeRgbcx(linRgba, w, h) {
      const m = exports.mark();
      try {
        const pixels = w * h;
        const linLen = pixels * 16;
        const outLen = (pixels / 16) * 8;
        const linPtr = exports.alloc(linLen);
        const outPtr = exports.alloc(outLen);
        f32(linPtr, pixels * 4).set(linRgba);
        exports.bc1EncodeRgbcx(linPtr, outPtr, w, h);
        const out = new Uint8Array(outLen);
        out.set(u8(outPtr, outLen));
        return out;
      } finally {
        exports.release(m);
      }
    },
    bc1EncodeThreaded(linRgba, srgbRgba, w, h, mode, threads) {
      return bc1EncodeThreaded(linRgba, srgbRgba, w, h, mode, threads);
    },
    bc3EncodeThreaded(linRgba, srgbRgba, w, h, threads) {
      return bc3EncodeThreaded(linRgba, srgbRgba, w, h, threads);
    },
    bc3Encode(linRgba, srgbRgba, w, h) {
      const m = exports.mark();
      try {
        const pixels = w * h;
        const linLen = pixels * 16;
        const srgbLen = pixels * 4;
        const outLen = (pixels / 16) * 16;
        const linPtr = exports.alloc(linLen);
        const srgbPtr = exports.alloc(srgbLen);
        const outPtr = exports.alloc(outLen);
        f32(linPtr, pixels * 4).set(linRgba);
        u8(srgbPtr, srgbLen).set(srgbRgba);
        exports.bc3Encode(linPtr, srgbPtr, outPtr, w, h);
        const out = new Uint8Array(outLen);
        out.set(u8(outPtr, outLen));
        return out;
      } finally {
        exports.release(m);
      }
    },
    deswizzle(swizzled, width, height, bpe, blockHeight) {
      const m = exports.mark();
      try {
        const inLen = swizzled.byteLength;
        const outLen = width * height * bpe;
        const inPtr = exports.alloc(inLen);
        const outPtr = exports.alloc(outLen);
        u8(inPtr, inLen).set(swizzled);
        exports.deswizzleBlockLinear(inPtr, inLen, outPtr, width, height, bpe, blockHeight);
        const out = new Uint8Array(outLen);
        out.set(u8(outPtr, outLen));
        return out;
      } finally {
        exports.release(m);
      }
    },
    swizzle(linear, width, height, bpe, blockHeight, base) {
      const m = exports.mark();
      try {
        const inLen = linear.byteLength;
        const outLen = paddedSwizzleSize(width, height, bpe, blockHeight);
        const useBase = base != null && base.byteLength === outLen;
        const baseLen = useBase ? base!.byteLength : 0;
        const inPtr = exports.alloc(inLen);
        const outPtr = exports.alloc(outLen);
        const basePtr = useBase ? exports.alloc(baseLen) : 0;
        u8(inPtr, inLen).set(linear);
        if (useBase) u8(basePtr, baseLen).set(base!);
        exports.swizzleBlockLinear(
          inPtr,
          inLen,
          outPtr,
          outLen,
          width,
          height,
          bpe,
          blockHeight,
          basePtr,
          baseLen,
        );
        const out = new Uint8Array(outLen);
        out.set(u8(outPtr, outLen));
        return out;
      } finally {
        exports.release(m);
      }
    },
    srgbToLinearF32(rgba) {
      const m = exports.mark();
      try {
        const pixels = rgba.byteLength / 4;
        const inLen = rgba.byteLength;
        const outLen = pixels * 16;
        const inPtr = exports.alloc(inLen);
        const outPtr = exports.alloc(outLen);
        u8(inPtr, inLen).set(rgba);
        exports.srgbU8ToLinearF32(inPtr, outPtr, pixels);
        const out = new Float32Array(pixels * 4);
        out.set(f32(outPtr, pixels * 4));
        return out;
      } finally {
        exports.release(m);
      }
    },
    linearF32ToU8(linear) {
      const m = exports.mark();
      try {
        const count = linear.length;
        const inLen = count * 4;
        const outLen = count;
        const inPtr = exports.alloc(inLen);
        const outPtr = exports.alloc(outLen);
        f32(inPtr, count).set(linear);
        exports.linearF32ToLinearU8(inPtr, outPtr, count);
        const out = new Uint8Array(outLen);
        out.set(u8(outPtr, outLen));
        return out;
      } finally {
        exports.release(m);
      }
    },
    linearU8ToSrgbU8InPlace(rgba) {
      const m = exports.mark();
      try {
        const len = rgba.byteLength;
        const ptr = exports.alloc(len);
        u8(ptr, len).set(rgba);
        exports.convertLinearU8ToSrgbU8(ptr, len);
        rgba.set(u8(ptr, len));
      } finally {
        exports.release(m);
      }
    },
    resize(rgba, srcW, srcH, dstW, dstH, fit, matte) {
      const m = exports.mark();
      try {
        const inLen = srcW * srcH * 4;
        const outLen = dstW * dstH * 4;
        const inPtr = exports.alloc(inLen);
        const outPtr = exports.alloc(outLen);
        u8(inPtr, inLen).set(rgba);
        const mr = matte ? matte.r : 0;
        const mg = matte ? matte.g : 0;
        const mb = matte ? matte.b : 0;
        const ma = matte ? matte.a : 0;
        exports.resizeRgba(inPtr, srcW, srcH, outPtr, dstW, dstH, fit, mr, mg, mb, ma);
        const out = new Uint8Array(outLen);
        out.set(u8(outPtr, outLen));
        return out;
      } finally {
        exports.release(m);
      }
    },
  };
}

let ready: Promise<UgcWasm> | null = null;

export function ensureUgcWasm(): Promise<UgcWasm> {
  if (!ready) {
    const p = loadWasm().then(makeWasm);
    p.catch(() => {
      if (ready === p) ready = null;
    });
    ready = p;
  }
  return ready;
}
