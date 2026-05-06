import { alloc, mark, release } from './arena';
import { SRGB_U8_TO_LINEAR_F32 } from './lut';
import { FitMode } from './abi';

@inline
function clampU8(v: i32): u8 {
  if (v < 0) return 0;
  if (v > 255) return 255;
  return <u8>v;
}

export function resizeRgbaImpl(
  srcPtr: usize,
  srcW: i32,
  srcH: i32,
  dstPtr: usize,
  dstW: i32,
  dstH: i32,
  fitMode: i32,
  matteR: i32,
  matteG: i32,
  matteB: i32,
  matteA: i32,
): void {
  if (srcW == dstW && srcH == dstH && fitMode != <i32>FitMode.Contain) {
    memory.copy(dstPtr, srcPtr, <usize>(srcW * srcH * 4));
    return;
  }

  let srcXf: f64 = 0.0;
  let srcYf: f64 = 0.0;
  let srcWf: f64 = <f64>srcW;
  let srcHf: f64 = <f64>srcH;
  let dstXf: f64 = 0.0;
  let dstYf: f64 = 0.0;
  let dstWf: f64 = <f64>dstW;
  let dstHf: f64 = <f64>dstH;

  if (fitMode == <i32>FitMode.Contain) {
    const sx = <f64>dstW / <f64>srcW;
    const sy = <f64>dstH / <f64>srcH;
    const scale = sx < sy ? sx : sy;
    dstWf = <f64>srcW * scale;
    dstHf = <f64>srcH * scale;
    dstXf = (<f64>dstW - dstWf) / 2.0;
    dstYf = (<f64>dstH - dstHf) / 2.0;
  } else if (fitMode == <i32>FitMode.Cover) {
    const sx = <f64>dstW / <f64>srcW;
    const sy = <f64>dstH / <f64>srcH;
    const scale = sx > sy ? sx : sy;
    srcWf = <f64>dstW / scale;
    srcHf = <f64>dstH / scale;
    srcXf = (<f64>srcW - srcWf) / 2.0;
    srcYf = (<f64>srcH - srcHf) / 2.0;
  }

  if (
    (fitMode == <i32>FitMode.Cover || fitMode == <i32>FitMode.Fill) &&
    srcXf == 0.0 &&
    srcYf == 0.0 &&
    dstXf == 0.0 &&
    dstYf == 0.0 &&
    srcWf == <f64>srcW &&
    srcHf == <f64>srcH &&
    dstWf == <f64>dstW &&
    dstHf == <f64>dstH
  ) {
    const xStepFast = <f64>srcW / <f64>dstW;
    const yStepFast = <f64>srcH / <f64>dstH;
    const xStepI = <i32>xStepFast;
    const yStepI = <i32>yStepFast;
    if (xStepI >= 2 && yStepI >= 2 && <f64>xStepI == xStepFast && <f64>yStepI == yStepFast) {
      const mFused = mark();
      const dstLinBytesFused = dstW * dstH * 16;
      const dstLinPtrFused: usize = <usize>alloc(dstLinBytesFused);
      const wsumFused: f64 = <f64>(xStepI * yStepI);
      const oxPairLimit = dstW & ~1;
      const lutBase = changetype<usize>(SRGB_U8_TO_LINEAR_F32);
      for (let oy = 0; oy < dstH; oy++) {
        const syStart = oy * yStepI;
        const syEnd = syStart + yStepI - 1;
        let oxBase = 0;
        for (; oxBase < oxPairLimit; oxBase += 2) {
          const sxStartL = oxBase * xStepI;
          const sxStartR = sxStartL + xStepI;
          let accR = f64x2.splat(0.0);
          let accG = f64x2.splat(0.0);
          let accB = f64x2.splat(0.0);
          let accA = f64x2.splat(0.0);
          if (xStepI == 2) {
            for (let sy = syStart; sy <= syEnd; sy++) {
              const baseOff = <usize>((sy * srcW + sxStartL) << 2);
              const px0 = load<u32>(srcPtr + baseOff, 0);
              const px1 = load<u32>(srcPtr + baseOff, 4);
              const px2 = load<u32>(srcPtr + baseOff, 8);
              const px3 = load<u32>(srcPtr + baseOff, 12);
              const lR0: f64 = <f64>load<f32>(lutBase + <usize>((px0 & 0xff) << 2));
              const lG0: f64 = <f64>load<f32>(lutBase + <usize>(((px0 >> 8) & 0xff) << 2));
              const lB0: f64 = <f64>load<f32>(lutBase + <usize>(((px0 >> 16) & 0xff) << 2));
              const lA0: f64 = <f64>(<f32>(<f64>(px0 >>> 24) / 255.0));
              const lR1: f64 = <f64>load<f32>(lutBase + <usize>((px1 & 0xff) << 2));
              const lG1: f64 = <f64>load<f32>(lutBase + <usize>(((px1 >> 8) & 0xff) << 2));
              const lB1: f64 = <f64>load<f32>(lutBase + <usize>(((px1 >> 16) & 0xff) << 2));
              const lA1: f64 = <f64>(<f32>(<f64>(px1 >>> 24) / 255.0));
              const rR0: f64 = <f64>load<f32>(lutBase + <usize>((px2 & 0xff) << 2));
              const rG0: f64 = <f64>load<f32>(lutBase + <usize>(((px2 >> 8) & 0xff) << 2));
              const rB0: f64 = <f64>load<f32>(lutBase + <usize>(((px2 >> 16) & 0xff) << 2));
              const rA0: f64 = <f64>(<f32>(<f64>(px2 >>> 24) / 255.0));
              const rR1: f64 = <f64>load<f32>(lutBase + <usize>((px3 & 0xff) << 2));
              const rG1: f64 = <f64>load<f32>(lutBase + <usize>(((px3 >> 8) & 0xff) << 2));
              const rB1: f64 = <f64>load<f32>(lutBase + <usize>(((px3 >> 16) & 0xff) << 2));
              const rA1: f64 = <f64>(<f32>(<f64>(px3 >>> 24) / 255.0));
              const R0p = f64x2.replace_lane(f64x2.splat(lR0), 1, rR0);
              const G0p = f64x2.replace_lane(f64x2.splat(lG0), 1, rG0);
              const B0p = f64x2.replace_lane(f64x2.splat(lB0), 1, rB0);
              const A0p = f64x2.replace_lane(f64x2.splat(lA0), 1, rA0);
              accR = f64x2.add(accR, f64x2.mul(R0p, A0p));
              accG = f64x2.add(accG, f64x2.mul(G0p, A0p));
              accB = f64x2.add(accB, f64x2.mul(B0p, A0p));
              accA = f64x2.add(accA, A0p);
              const R1p = f64x2.replace_lane(f64x2.splat(lR1), 1, rR1);
              const G1p = f64x2.replace_lane(f64x2.splat(lG1), 1, rG1);
              const B1p = f64x2.replace_lane(f64x2.splat(lB1), 1, rB1);
              const A1p = f64x2.replace_lane(f64x2.splat(lA1), 1, rA1);
              accR = f64x2.add(accR, f64x2.mul(R1p, A1p));
              accG = f64x2.add(accG, f64x2.mul(G1p, A1p));
              accB = f64x2.add(accB, f64x2.mul(B1p, A1p));
              accA = f64x2.add(accA, A1p);
            }
          } else {
            for (let sy = syStart; sy <= syEnd; sy++) {
              const rowBase = sy * srcW;
              for (let sxOff = 0; sxOff < xStepI; sxOff++) {
                const lsOff = <usize>((rowBase + sxStartL + sxOff) * 4);
                const lr_u8 = load<u8>(srcPtr + lsOff);
                const lg_u8 = load<u8>(srcPtr + lsOff + 1);
                const lb_u8 = load<u8>(srcPtr + lsOff + 2);
                const la_u8 = load<u8>(srcPtr + lsOff + 3);
                const rsOff = <usize>((rowBase + sxStartR + sxOff) * 4);
                const rr_u8 = load<u8>(srcPtr + rsOff);
                const rg_u8 = load<u8>(srcPtr + rsOff + 1);
                const rb_u8 = load<u8>(srcPtr + rsOff + 2);
                const ra_u8 = load<u8>(srcPtr + rsOff + 3);
                const lR: f64 = <f64>SRGB_U8_TO_LINEAR_F32[lr_u8];
                const lG: f64 = <f64>SRGB_U8_TO_LINEAR_F32[lg_u8];
                const lB: f64 = <f64>SRGB_U8_TO_LINEAR_F32[lb_u8];
                const lAf32: f32 = <f32>(<f64>la_u8 / 255.0);
                const lA: f64 = <f64>lAf32;
                const rR: f64 = <f64>SRGB_U8_TO_LINEAR_F32[rr_u8];
                const rG: f64 = <f64>SRGB_U8_TO_LINEAR_F32[rg_u8];
                const rB: f64 = <f64>SRGB_U8_TO_LINEAR_F32[rb_u8];
                const rAf32: f32 = <f32>(<f64>ra_u8 / 255.0);
                const rA: f64 = <f64>rAf32;
                const R_pair = f64x2.replace_lane(f64x2.splat(lR), 1, rR);
                const G_pair = f64x2.replace_lane(f64x2.splat(lG), 1, rG);
                const B_pair = f64x2.replace_lane(f64x2.splat(lB), 1, rB);
                const A_pair = f64x2.replace_lane(f64x2.splat(lA), 1, rA);
                accR = f64x2.add(accR, f64x2.mul(R_pair, A_pair));
                accG = f64x2.add(accG, f64x2.mul(G_pair, A_pair));
                accB = f64x2.add(accB, f64x2.mul(B_pair, A_pair));
                accA = f64x2.add(accA, A_pair);
              }
            }
          }
          const lR_sum = f64x2.extract_lane(accR, 0);
          const lG_sum = f64x2.extract_lane(accG, 0);
          const lB_sum = f64x2.extract_lane(accB, 0);
          const lAW = f64x2.extract_lane(accA, 0);
          const rR_sum = f64x2.extract_lane(accR, 1);
          const rG_sum = f64x2.extract_lane(accG, 1);
          const rB_sum = f64x2.extract_lane(accB, 1);
          const rAW = f64x2.extract_lane(accA, 1);
          const dOffL = <usize>((oy * dstW + oxBase) * 16);
          const dOffR = dOffL + 16;
          const lAOut = lAW / wsumFused;
          if (lAW > 0.0) {
            const inv = 1.0 / lAW;
            store<f32>(dstLinPtrFused + dOffL, <f32>(lR_sum * inv * lAOut));
            store<f32>(dstLinPtrFused + dOffL + 4, <f32>(lG_sum * inv * lAOut));
            store<f32>(dstLinPtrFused + dOffL + 8, <f32>(lB_sum * inv * lAOut));
            store<f32>(dstLinPtrFused + dOffL + 12, <f32>lAOut);
          } else {
            store<f32>(dstLinPtrFused + dOffL, 0);
            store<f32>(dstLinPtrFused + dOffL + 4, 0);
            store<f32>(dstLinPtrFused + dOffL + 8, 0);
            store<f32>(dstLinPtrFused + dOffL + 12, 0);
          }
          const rAOut = rAW / wsumFused;
          if (rAW > 0.0) {
            const inv = 1.0 / rAW;
            store<f32>(dstLinPtrFused + dOffR, <f32>(rR_sum * inv * rAOut));
            store<f32>(dstLinPtrFused + dOffR + 4, <f32>(rG_sum * inv * rAOut));
            store<f32>(dstLinPtrFused + dOffR + 8, <f32>(rB_sum * inv * rAOut));
            store<f32>(dstLinPtrFused + dOffR + 12, <f32>rAOut);
          } else {
            store<f32>(dstLinPtrFused + dOffR, 0);
            store<f32>(dstLinPtrFused + dOffR + 4, 0);
            store<f32>(dstLinPtrFused + dOffR + 8, 0);
            store<f32>(dstLinPtrFused + dOffR + 12, 0);
          }
        }
        for (let ox = oxBase; ox < dstW; ox++) {
          const sxStart = ox * xStepI;
          const sxEnd = sxStart + xStepI - 1;
          let r: f64 = 0.0;
          let g: f64 = 0.0;
          let b: f64 = 0.0;
          let aw: f64 = 0.0;
          for (let sy = syStart; sy <= syEnd; sy++) {
            const rowBase = sy * srcW;
            for (let sx = sxStart; sx <= sxEnd; sx++) {
              const sOff = <usize>((rowBase + sx) * 4);
              const r_u8 = load<u8>(srcPtr + sOff);
              const g_u8 = load<u8>(srcPtr + sOff + 1);
              const b_u8 = load<u8>(srcPtr + sOff + 2);
              const a_u8 = load<u8>(srcPtr + sOff + 3);
              const R: f64 = <f64>SRGB_U8_TO_LINEAR_F32[r_u8];
              const G: f64 = <f64>SRGB_U8_TO_LINEAR_F32[g_u8];
              const B: f64 = <f64>SRGB_U8_TO_LINEAR_F32[b_u8];
              const af32: f32 = <f32>(<f64>a_u8 / 255.0);
              const a: f64 = <f64>af32;
              r += R * a;
              g += G * a;
              b += B * a;
              aw += a;
            }
          }
          const dOff = <usize>((oy * dstW + ox) * 16);
          const aOut = aw / wsumFused;
          if (aw > 0.0) {
            const inv = 1.0 / aw;
            store<f32>(dstLinPtrFused + dOff, <f32>(r * inv * aOut));
            store<f32>(dstLinPtrFused + dOff + 4, <f32>(g * inv * aOut));
            store<f32>(dstLinPtrFused + dOff + 8, <f32>(b * inv * aOut));
            store<f32>(dstLinPtrFused + dOff + 12, <f32>aOut);
          } else {
            store<f32>(dstLinPtrFused + dOff, 0);
            store<f32>(dstLinPtrFused + dOff + 4, 0);
            store<f32>(dstLinPtrFused + dOff + 8, 0);
            store<f32>(dstLinPtrFused + dOff + 12, 0);
          }
        }
      }
      const totalDstPixelsFused = dstW * dstH;
      for (let p = 0; p < totalDstPixelsFused; p++) {
        const dOff = <usize>(p * 16);
        const oOff = <usize>(p * 4);
        const lr0 = <f64>load<f32>(dstLinPtrFused + dOff);
        const lg0 = <f64>load<f32>(dstLinPtrFused + dOff + 4);
        const lb0 = <f64>load<f32>(dstLinPtrFused + dOff + 8);
        const la = <f64>load<f32>(dstLinPtrFused + dOff + 12);
        let lr: f64;
        let lg: f64;
        let lb: f64;
        if (la > 0.0) {
          const inv = 1.0 / la;
          lr = lr0 * inv;
          lg = lg0 * inv;
          lb = lb0 * inv;
        } else {
          lr = 0.0;
          lg = 0.0;
          lb = 0.0;
        }
        const sR =
          lr <= 0.0031308
            ? lr * 12.92
            : 1.055 * Math.exp(Math.log(Math.max(0.0, lr)) / 2.4) - 0.055;
        const sG =
          lg <= 0.0031308
            ? lg * 12.92
            : 1.055 * Math.exp(Math.log(Math.max(0.0, lg)) / 2.4) - 0.055;
        const sB =
          lb <= 0.0031308
            ? lb * 12.92
            : 1.055 * Math.exp(Math.log(Math.max(0.0, lb)) / 2.4) - 0.055;
        store<u8>(dstPtr + oOff, clampU8(<i32>Math.round(sR * 255.0)));
        store<u8>(dstPtr + oOff + 1, clampU8(<i32>Math.round(sG * 255.0)));
        store<u8>(dstPtr + oOff + 2, clampU8(<i32>Math.round(sB * 255.0)));
        store<u8>(dstPtr + oOff + 3, clampU8(<i32>Math.round(la * 255.0)));
      }
      release(mFused);
      return;
    }
  }

  const m = mark();
  const srcLinBytes = srcW * srcH * 16;
  const dstLinBytes = dstW * dstH * 16;
  const srcLinPtr: usize = <usize>alloc(srcLinBytes);
  const dstLinPtr: usize = <usize>alloc(dstLinBytes);

  const totalSrcPixels = srcW * srcH;
  for (let p = 0; p < totalSrcPixels; p++) {
    const sOff = <usize>(p * 4);
    const dOff = <usize>(p * 16);
    const r = load<u8>(srcPtr + sOff);
    const g = load<u8>(srcPtr + sOff + 1);
    const b = load<u8>(srcPtr + sOff + 2);
    const a = load<u8>(srcPtr + sOff + 3);
    store<f32>(srcLinPtr + dOff, SRGB_U8_TO_LINEAR_F32[r]);
    store<f32>(srcLinPtr + dOff + 4, SRGB_U8_TO_LINEAR_F32[g]);
    store<f32>(srcLinPtr + dOff + 8, SRGB_U8_TO_LINEAR_F32[b]);
    store<f32>(srcLinPtr + dOff + 12, <f32>(<f64>a / 255.0));
  }

  memory.fill(dstLinPtr, 0, <usize>dstLinBytes);

  if (fitMode == <i32>FitMode.Contain && matteA > 0) {
    const ma = <f64>matteA / 255.0;
    const mr = <f64>SRGB_U8_TO_LINEAR_F32[matteR] * ma;
    const mg = <f64>SRGB_U8_TO_LINEAR_F32[matteG] * ma;
    const mb = <f64>SRGB_U8_TO_LINEAR_F32[matteB] * ma;
    const totalDstPixels = dstW * dstH;
    for (let p = 0; p < totalDstPixels; p++) {
      const dOff = <usize>(p * 16);
      store<f32>(dstLinPtr + dOff, <f32>mr);
      store<f32>(dstLinPtr + dOff + 4, <f32>mg);
      store<f32>(dstLinPtr + dOff + 8, <f32>mb);
      store<f32>(dstLinPtr + dOff + 12, <f32>ma);
    }
  }

  let dstX0 = <i32>Math.floor(dstXf);
  if (dstX0 < 0) dstX0 = 0;
  let dstY0 = <i32>Math.floor(dstYf);
  if (dstY0 < 0) dstY0 = 0;
  let dstX1 = <i32>Math.ceil(dstXf + dstWf);
  if (dstX1 > dstW) dstX1 = dstW;
  let dstY1 = <i32>Math.ceil(dstYf + dstHf);
  if (dstY1 > dstH) dstY1 = dstH;

  const xStep = srcWf / dstWf;
  const yStep = srcHf / dstHf;
  const useAreaX = xStep > 1.0;
  const useAreaY = yStep > 1.0;
  const sw = srcW;
  const sh = srcH;

  for (let oy = dstY0; oy < dstY1; oy++) {
    let fy0: f64;
    let fy1: f64;
    if (useAreaY) {
      fy0 = ((<f64>oy - dstYf) / dstHf) * srcHf + srcYf;
      fy1 = ((<f64>oy + 1.0 - dstYf) / dstHf) * srcHf + srcYf;
    } else {
      const fyc = ((<f64>oy + 0.5 - dstYf) / dstHf) * srcHf + srcYf - 0.5;
      fy0 = fyc;
      fy1 = fyc + 1.0;
    }
    let syStart = <i32>Math.floor(fy0);
    if (syStart < 0) syStart = 0;
    let syEnd = <i32>Math.ceil(fy1) - 1;
    if (syEnd > sh - 1) syEnd = sh - 1;
    const yIntegerAligned = fy0 == <f64>syStart && fy1 == <f64>(syEnd + 1);
    for (let ox = dstX0; ox < dstX1; ox++) {
      let fx0: f64;
      let fx1: f64;
      if (useAreaX) {
        fx0 = ((<f64>ox - dstXf) / dstWf) * srcWf + srcXf;
        fx1 = ((<f64>ox + 1.0 - dstXf) / dstWf) * srcWf + srcXf;
      } else {
        const fxc = ((<f64>ox + 0.5 - dstXf) / dstWf) * srcWf + srcXf - 0.5;
        fx0 = fxc;
        fx1 = fxc + 1.0;
      }
      let r: f64 = 0.0;
      let g: f64 = 0.0;
      let b: f64 = 0.0;
      let aw: f64 = 0.0;
      let wsum: f64 = 0.0;
      let sxStart = <i32>Math.floor(fx0);
      if (sxStart < 0) sxStart = 0;
      let sxEnd = <i32>Math.ceil(fx1) - 1;
      if (sxEnd > sw - 1) sxEnd = sw - 1;
      if (yIntegerAligned && fx0 == <f64>sxStart && fx1 == <f64>(sxEnd + 1)) {
        let accRG = f64x2.splat(0.0);
        for (let sy = syStart; sy <= syEnd; sy++) {
          for (let sx = sxStart; sx <= sxEnd; sx++) {
            const off = <usize>((sy * sw + sx) * 16);
            const pixel = v128.load(srcLinPtr + off);
            const rg = v128.promote_low<f32>(pixel);
            const a = <f64>load<f32>(srcLinPtr + off + 12);
            const bp = <f64>load<f32>(srcLinPtr + off + 8);
            accRG = f64x2.add(accRG, f64x2.mul(rg, f64x2.splat(a)));
            b += bp * a;
            aw += a;
            wsum += 1.0;
          }
        }
        r = f64x2.extract_lane(accRG, 0);
        g = f64x2.extract_lane(accRG, 1);
      } else {
        for (let sy = syStart; sy <= syEnd; sy++) {
          const syF = <f64>sy;
          const syHi = syF + 1.0;
          const lo = syF > fy0 ? syF : fy0;
          const hi = syHi < fy1 ? syHi : fy1;
          const wy = hi - lo;
          if (wy <= 0.0) continue;
          for (let sx = sxStart; sx <= sxEnd; sx++) {
            const sxF = <f64>sx;
            const sxHi = sxF + 1.0;
            const lox = sxF > fx0 ? sxF : fx0;
            const hix = sxHi < fx1 ? sxHi : fx1;
            const wx = hix - lox;
            if (wx <= 0.0) continue;
            const w = wx * wy;
            const off = <usize>((sy * sw + sx) * 16);
            const a = <f64>load<f32>(srcLinPtr + off + 12);
            const wa = w * a;
            r += <f64>load<f32>(srcLinPtr + off) * wa;
            g += <f64>load<f32>(srcLinPtr + off + 4) * wa;
            b += <f64>load<f32>(srcLinPtr + off + 8) * wa;
            aw += wa;
            wsum += w;
          }
        }
      }
      if (wsum <= 0.0) continue;
      const dOff = <usize>((oy * dstW + ox) * 16);
      const aOut = aw / wsum;
      if (aw > 0.0) {
        const inv = 1.0 / aw;
        const sR = r * inv * aOut;
        const sG = g * inv * aOut;
        const sB = b * inv * aOut;
        const mA = 1.0 - aOut;
        const cR = <f64>load<f32>(dstLinPtr + dOff);
        const cG = <f64>load<f32>(dstLinPtr + dOff + 4);
        const cB = <f64>load<f32>(dstLinPtr + dOff + 8);
        const cA = <f64>load<f32>(dstLinPtr + dOff + 12);
        store<f32>(dstLinPtr + dOff, <f32>(sR + cR * mA));
        store<f32>(dstLinPtr + dOff + 4, <f32>(sG + cG * mA));
        store<f32>(dstLinPtr + dOff + 8, <f32>(sB + cB * mA));
        store<f32>(dstLinPtr + dOff + 12, <f32>(aOut + cA * mA));
      } else {
        const cA = <f64>load<f32>(dstLinPtr + dOff + 12);
        store<f32>(dstLinPtr + dOff + 12, <f32>(cA * (1.0 - aOut)));
      }
    }
  }

  const totalDstPixels = dstW * dstH;
  for (let p = 0; p < totalDstPixels; p++) {
    const dOff = <usize>(p * 16);
    const oOff = <usize>(p * 4);
    const lr0 = <f64>load<f32>(dstLinPtr + dOff);
    const lg0 = <f64>load<f32>(dstLinPtr + dOff + 4);
    const lb0 = <f64>load<f32>(dstLinPtr + dOff + 8);
    const la = <f64>load<f32>(dstLinPtr + dOff + 12);
    let lr: f64;
    let lg: f64;
    let lb: f64;
    if (la > 0.0) {
      const inv = 1.0 / la;
      lr = lr0 * inv;
      lg = lg0 * inv;
      lb = lb0 * inv;
    } else {
      lr = 0.0;
      lg = 0.0;
      lb = 0.0;
    }
    const sR =
      lr <= 0.0031308 ? lr * 12.92 : 1.055 * Math.exp(Math.log(Math.max(0.0, lr)) / 2.4) - 0.055;
    const sG =
      lg <= 0.0031308 ? lg * 12.92 : 1.055 * Math.exp(Math.log(Math.max(0.0, lg)) / 2.4) - 0.055;
    const sB =
      lb <= 0.0031308 ? lb * 12.92 : 1.055 * Math.exp(Math.log(Math.max(0.0, lb)) / 2.4) - 0.055;
    store<u8>(dstPtr + oOff, clampU8(<i32>Math.round(sR * 255.0)));
    store<u8>(dstPtr + oOff + 1, clampU8(<i32>Math.round(sG * 255.0)));
    store<u8>(dstPtr + oOff + 2, clampU8(<i32>Math.round(sB * 255.0)));
    store<u8>(dstPtr + oOff + 3, clampU8(<i32>Math.round(la * 255.0)));
  }

  release(m);
}
