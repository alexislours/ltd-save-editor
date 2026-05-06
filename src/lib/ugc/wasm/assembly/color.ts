import {
  SRGB_U8_TO_LINEAR_F32,
  LINEAR_U8_TO_SRGB_U8,
  LINEAR_U8_TO_GAMMA_DERIV2,
  U8_DIV_255_F32,
} from './lut';

export function srgbU8ToLinearF32Impl(srcPtr: usize, dstPtr: usize, pixelCount: i32): void {
  const lutSrgb = changetype<usize>(SRGB_U8_TO_LINEAR_F32);
  const lutDiv = changetype<usize>(U8_DIV_255_F32);
  const quad = pixelCount & ~3;
  let p = 0;
  for (; p < quad; p += 4) {
    const srcBase = srcPtr + <usize>(p << 2);
    const dstBase = dstPtr + <usize>(p << 4);
    const px0 = load<u32>(srcBase, 0);
    const px1 = load<u32>(srcBase, 4);
    const px2 = load<u32>(srcBase, 8);
    const px3 = load<u32>(srcBase, 12);

    const src4 = v128.load(srcBase);
    const alphasI = i32x4.shr_u(src4, 24);
    const alphasF = f32x4.div(f32x4.convert_i32x4_s(alphasI), f32x4.splat(<f32>255.0));

    let v0 = v128.load_zero<f32>(lutSrgb + <usize>((px0 & 0xff) << 2));
    let v1 = v128.load_zero<f32>(lutSrgb + <usize>((px1 & 0xff) << 2));
    let v2 = v128.load_zero<f32>(lutSrgb + <usize>((px2 & 0xff) << 2));
    let v3 = v128.load_zero<f32>(lutSrgb + <usize>((px3 & 0xff) << 2));

    v0 = v128.load_lane<f32>(lutSrgb + <usize>(((px0 >> 8) & 0xff) << 2), v0, 1);
    v1 = v128.load_lane<f32>(lutSrgb + <usize>(((px1 >> 8) & 0xff) << 2), v1, 1);
    v2 = v128.load_lane<f32>(lutSrgb + <usize>(((px2 >> 8) & 0xff) << 2), v2, 1);
    v3 = v128.load_lane<f32>(lutSrgb + <usize>(((px3 >> 8) & 0xff) << 2), v3, 1);

    v0 = v128.load_lane<f32>(lutSrgb + <usize>(((px0 >> 16) & 0xff) << 2), v0, 2);
    v1 = v128.load_lane<f32>(lutSrgb + <usize>(((px1 >> 16) & 0xff) << 2), v1, 2);
    v2 = v128.load_lane<f32>(lutSrgb + <usize>(((px2 >> 16) & 0xff) << 2), v2, 2);
    v3 = v128.load_lane<f32>(lutSrgb + <usize>(((px3 >> 16) & 0xff) << 2), v3, 2);

    v0 = f32x4.replace_lane(v0, 3, f32x4.extract_lane(alphasF, 0));
    v1 = f32x4.replace_lane(v1, 3, f32x4.extract_lane(alphasF, 1));
    v2 = f32x4.replace_lane(v2, 3, f32x4.extract_lane(alphasF, 2));
    v3 = f32x4.replace_lane(v3, 3, f32x4.extract_lane(alphasF, 3));

    v128.store(dstBase, v0, 0);
    v128.store(dstBase, v1, 16);
    v128.store(dstBase, v2, 32);
    v128.store(dstBase, v3, 48);
  }
  for (; p < pixelCount; p++) {
    const sOff = <usize>(p << 2);
    const dOff = <usize>(p << 4);
    const px = load<u32>(srcPtr + sOff);
    const rOff = <usize>((px & 0xff) << 2);
    const gOff = <usize>(((px >> 8) & 0xff) << 2);
    const bOff = <usize>(((px >> 16) & 0xff) << 2);
    const aOff = <usize>((px >> 24) << 2);
    let v = v128.load_zero<f32>(lutSrgb + rOff);
    v = v128.load_lane<f32>(lutSrgb + gOff, v, 1);
    v = v128.load_lane<f32>(lutSrgb + bOff, v, 2);
    v = v128.load_lane<f32>(lutDiv + aOff, v, 3);
    v128.store(dstPtr + dOff, v);
  }
}

export function linearF32ToLinearU8Impl(srcPtr: usize, dstPtr: usize, count: i32): void {
  const k255 = f32x4.splat(<f32>255.0);
  const kHalf = f32x4.splat(<f32>0.5);
  const wide = count & ~15;
  let i = 0;
  for (; i < wide; i += 16) {
    const sBase = srcPtr + <usize>(i << 2);
    const v0 = f32x4.add(f32x4.mul(v128.load(sBase, 0), k255), kHalf);
    const v1 = f32x4.add(f32x4.mul(v128.load(sBase, 16), k255), kHalf);
    const v2 = f32x4.add(f32x4.mul(v128.load(sBase, 32), k255), kHalf);
    const v3 = f32x4.add(f32x4.mul(v128.load(sBase, 48), k255), kHalf);
    const i0 = i32x4.trunc_sat_f32x4_s(v0);
    const i1 = i32x4.trunc_sat_f32x4_s(v1);
    const i2 = i32x4.trunc_sat_f32x4_s(v2);
    const i3 = i32x4.trunc_sat_f32x4_s(v3);
    const s01 = i16x8.narrow_i32x4_s(i0, i1);
    const s23 = i16x8.narrow_i32x4_s(i2, i3);
    v128.store(dstPtr + <usize>i, i8x16.narrow_i16x8_u(s01, s23));
  }
  for (; i < count; i++) {
    const v = <f64>load<f32>(srcPtr + <usize>(i * 4)) * 255.0;
    let r: i32;
    if (v < 0.0) r = 0;
    else if (v > 255.0) r = 255;
    else r = <i32>Math.round(v);
    store<u8>(dstPtr + <usize>i, <u8>r);
  }
}

export function convertLinearU8ToSrgbU8Impl(rgbaPtr: usize, byteLen: i32): void {
  const lut = changetype<usize>(LINEAR_U8_TO_SRGB_U8);
  const wide = byteLen & ~15;
  let i = 0;
  for (; i < wide; i += 16) {
    const base = rgbaPtr + <usize>i;
    const p0 = load<u32>(base, 0);
    const p1 = load<u32>(base, 4);
    const p2 = load<u32>(base, 8);
    const p3 = load<u32>(base, 12);

    const r0 = <u32>load<u8>(lut + <usize>(p0 & 0xff));
    const g0 = <u32>load<u8>(lut + <usize>((p0 >> 8) & 0xff));
    const b0 = <u32>load<u8>(lut + <usize>((p0 >> 16) & 0xff));
    const r1 = <u32>load<u8>(lut + <usize>(p1 & 0xff));
    const g1 = <u32>load<u8>(lut + <usize>((p1 >> 8) & 0xff));
    const b1 = <u32>load<u8>(lut + <usize>((p1 >> 16) & 0xff));
    const r2 = <u32>load<u8>(lut + <usize>(p2 & 0xff));
    const g2 = <u32>load<u8>(lut + <usize>((p2 >> 8) & 0xff));
    const b2 = <u32>load<u8>(lut + <usize>((p2 >> 16) & 0xff));
    const r3 = <u32>load<u8>(lut + <usize>(p3 & 0xff));
    const g3 = <u32>load<u8>(lut + <usize>((p3 >> 8) & 0xff));
    const b3 = <u32>load<u8>(lut + <usize>((p3 >> 16) & 0xff));

    store<u32>(base, (p0 & 0xff000000) | r0 | (g0 << 8) | (b0 << 16), 0);
    store<u32>(base, (p1 & 0xff000000) | r1 | (g1 << 8) | (b1 << 16), 4);
    store<u32>(base, (p2 & 0xff000000) | r2 | (g2 << 8) | (b2 << 16), 8);
    store<u32>(base, (p3 & 0xff000000) | r3 | (g3 << 8) | (b3 << 16), 12);
  }
  for (; i < byteLen; i += 4) {
    const off = <usize>i;
    const px = load<u32>(rgbaPtr + off);
    const r = <u32>load<u8>(lut + <usize>(px & 0xff));
    const g = <u32>load<u8>(lut + <usize>((px >> 8) & 0xff));
    const b = <u32>load<u8>(lut + <usize>((px >> 16) & 0xff));
    store<u32>(rgbaPtr + off, (px & 0xff000000) | r | (g << 8) | (b << 16));
  }
}

@inline
export function gammaWeight(L: f64): f64 {
  let idx = <i32>(L * 255.0 + 0.5);
  if (idx < 0) idx = 0;
  else if (idx > 255) idx = 255;
  return <f64>LINEAR_U8_TO_GAMMA_DERIV2[idx];
}

@inline
export function linearToSrgbF(L: f64): f64 {
  let idx = <i32>(L * 255.0 + 0.5);
  if (idx < 0) idx = 0;
  else if (idx > 255) idx = 255;
  return <f64>LINEAR_U8_TO_SRGB_U8[idx] / 255.0;
}
