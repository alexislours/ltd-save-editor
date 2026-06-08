import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { createUgcWasm, type UgcWasm } from './index.js';
import { Bc1Mode, FitMode } from './types.js';

const wasmBytes = readFileSync(new URL('../build/ugc.wasm', import.meta.url));

function solid(w: number, h: number, r: number, g: number, b: number, a: number): Uint8Array {
  const out = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a;
  }
  return out;
}

function isUniform(pixels: Uint8Array): boolean {
  for (let i = 1; i * 4 < pixels.length; i++) {
    for (let c = 0; c < 4; c++) {
      if (pixels[i * 4 + c] !== pixels[c]) return false;
    }
  }
  return true;
}

function maxAbsDiff(a: Uint8Array, b: Uint8Array): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

let wasm: UgcWasm;

beforeAll(async () => {
  wasm = await createUgcWasm({ wasm: wasmBytes });
});

describe('createUgcWasm', () => {
  it('instantiates from a Uint8Array source', async () => {
    const w = await createUgcWasm({ wasm: wasmBytes });
    expect(typeof w.bc1Decode).toBe('function');
  });

  it('instantiates from an ArrayBuffer source', async () => {
    const buf = wasmBytes.buffer.slice(
      wasmBytes.byteOffset,
      wasmBytes.byteOffset + wasmBytes.byteLength,
    );
    const w = await createUgcWasm({ wasm: buf });
    expect(typeof w.bc3Decode).toBe('function');
  });

  it('rejects an unsupported source', async () => {
    await expect(createUgcWasm({ wasm: 'nope' as never })).rejects.toThrow();
  });
});

describe('sRGB / linear conversion', () => {
  it('maps the sRGB endpoints to linear 0 and 1', () => {
    const lin = wasm.srgbToLinearF32(new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]));
    expect(lin[0]).toBeCloseTo(0, 6);
    expect(lin[4]).toBeCloseTo(1, 6);
  });

  it('round-trips sRGB through linear within one code', () => {
    const srgb = new Uint8Array([0, 64, 128, 255, 200, 12, 255, 0]);
    const back = wasm.linearF32ToU8(wasm.srgbToLinearF32(srgb));
    wasm.linearU8ToSrgbU8InPlace(back);
    expect(back[0]).toBe(0);
    expect(back[6]).toBe(255);
    expect(maxAbsDiff(srgb, back)).toBeLessThanOrEqual(1);
  });
});

describe('BC1', () => {
  it('emits 8 bytes per 4x4 block and decodes to RGBA', () => {
    const srgb = solid(8, 8, 128, 64, 200, 255);
    const enc = wasm.bc1Encode(wasm.srgbToLinearF32(srgb), srgb, 8, 8, Bc1Mode.Auto);
    expect(enc.length).toBe(32);
    expect(wasm.bc1Decode(enc, 8, 8).length).toBe(8 * 8 * 4);
  });

  it('round-trips solid black and white exactly', () => {
    for (const v of [0, 255]) {
      const srgb = solid(4, 4, v, v, v, 255);
      const dec = wasm.bc1Decode(
        wasm.bc1Encode(wasm.srgbToLinearF32(srgb), srgb, 4, 4, Bc1Mode.Auto),
        4,
        4,
      );
      expect(isUniform(dec)).toBe(true);
      for (let c = 0; c < 3; c++) expect(dec[c]).toBe(v);
    }
  });

  it('decodes a solid block to its linear value', () => {
    const srgb = solid(4, 4, 200, 40, 40, 255);
    const lin = wasm.srgbToLinearF32(srgb);
    const expected = wasm.linearF32ToU8(lin);
    const dec = wasm.bc1Decode(wasm.bc1Encode(lin, srgb, 4, 4, Bc1Mode.Auto), 4, 4);
    expect(isUniform(dec)).toBe(true);
    for (let c = 0; c < 3; c++) expect(Math.abs(dec[c] - expected[c])).toBeLessThanOrEqual(8);
  });

  it('encodes deterministically', () => {
    const srgb = solid(4, 4, 200, 40, 40, 255);
    const lin = wasm.srgbToLinearF32(srgb);
    const a = wasm.bc1Encode(lin, srgb, 4, 4, Bc1Mode.Auto);
    const b = wasm.bc1Encode(lin, srgb, 4, 4, Bc1Mode.Auto);
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});

describe('BC3', () => {
  it('emits 16 bytes per 4x4 block', () => {
    const srgb = solid(8, 8, 30, 180, 90, 200);
    expect(wasm.bc3Encode(wasm.srgbToLinearF32(srgb), srgb, 8, 8).length).toBe(64);
  });

  it('preserves a solid alpha and decodes to a uniform block', () => {
    const srgb = solid(4, 4, 30, 180, 90, 128);
    const dec = wasm.bc3Decode(wasm.bc3Encode(wasm.srgbToLinearF32(srgb), srgb, 4, 4), 4, 4);
    expect(isUniform(dec)).toBe(true);
    for (let i = 0; i * 4 < dec.length; i++) expect(dec[i * 4 + 3]).toBe(128);
  });
});

describe('block-linear swizzle', () => {
  it.each([
    [16, 16, 4, 1],
    [8, 8, 4, 1],
    [32, 8, 4, 1],
    [16, 16, 4, 2],
    [16, 16, 8, 1],
  ])('round-trips %ix%i bpe=%i blockHeight=%i', (w, h, bpe, blockHeight) => {
    const linear = new Uint8Array(w * h * bpe);
    for (let i = 0; i < linear.length; i++) linear[i] = (i * 13 + 5) & 0xff;
    const swizzled = wasm.swizzle(linear, w, h, bpe, blockHeight, null);
    const back = wasm.deswizzle(swizzled, w, h, bpe, blockHeight);
    expect(Array.from(back)).toEqual(Array.from(linear));
  });
});

describe('resize', () => {
  it('keeps a solid image solid and changes dimensions', () => {
    const src = solid(2, 2, 10, 20, 30, 255);
    const out = wasm.resize(src, 2, 2, 8, 8, FitMode.Fill, null);
    expect(out.length).toBe(8 * 8 * 4);
    expect(isUniform(out)).toBe(true);
    expect(Array.from(out.subarray(0, 4))).toEqual([10, 20, 30, 255]);
  });

  it('letterboxes with the matte colour in Contain mode', () => {
    const src = solid(4, 2, 10, 20, 30, 255);
    const out = wasm.resize(src, 4, 2, 4, 4, FitMode.Contain, { r: 255, g: 255, b: 255, a: 255 });
    const row = (y: number) => Array.from(out.subarray(y * 4 * 4, y * 4 * 4 + 4));
    expect(row(0)).toEqual([255, 255, 255, 255]);
    expect(row(3)).toEqual([255, 255, 255, 255]);
    expect(row(1)).toEqual([10, 20, 30, 255]);
  });
});
