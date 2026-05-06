import { Bc1Mode } from './abi';
import { gammaWeight, linearToSrgbF } from './color';

const blockPixels = new StaticArray<f32>(64);
const blockSrgb = new StaticArray<f32>(48);
const blockSrgbR64 = new StaticArray<f64>(16);
const blockSrgbG64 = new StaticArray<f64>(16);
const blockSrgbB64 = new StaticArray<f64>(16);
const blockWeights = new StaticArray<f32>(48);
const bestPal = new StaticArray<f32>(16);
const bestPalSrgb = new StaticArray<f32>(12);
const altPal = new StaticArray<f32>(16);
const altPalSrgb = new StaticArray<f32>(12);

const pal8 = new StaticArray<f32>(8);
const pal6 = new StaticArray<f32>(8);
const blockA = new StaticArray<f32>(16);
const idx8 = new StaticArray<u8>(16);
const idx6 = new StaticArray<u8>(16);

const PCA_K = new StaticArray<f64>(3);
PCA_K[0] = 1.0;
PCA_K[1] = 1.5;
PCA_K[2] = 2.0;

const seenC0 = new StaticArray<i32>(16);
const seenC1 = new StaticArray<i32>(16);
const seenT = new StaticArray<bool>(16);
let seenN: i32 = 0;

let bestC0Out: i32 = 0;
let bestC1Out: i32 = 0;
let bestErrOut: f64 = 0.0;
let bestIdx3Out: bool = false;
let haveBestOut: bool = false;
let evalIdx3: bool = false;

let refitE0r: f64 = 0.0;
let refitE0g: f64 = 0.0;
let refitE0b: f64 = 0.0;
let refitE1r: f64 = 0.0;
let refitE1g: f64 = 0.0;
let refitE1b: f64 = 0.0;

@inline
function clamp01(x: f64): f64 {
  if (x < 0.0) return 0.0;
  if (x > 1.0) return 1.0;
  return x;
}

@inline
function rgb565QuantizeF(r: f64, g: f64, b: f64): i32 {
  const r5 = <i32>Math.round(clamp01(r) * 31.0);
  const g6 = <i32>Math.round(clamp01(g) * 63.0);
  const b5 = <i32>Math.round(clamp01(b) * 31.0);
  return ((r5 << 11) | (g6 << 5) | b5) & 0xffff;
}

function buildBc1Palette(c0: i32, c1: i32, palette: StaticArray<f32>): bool {
  const r0: i32 = (((c0 >> 11) & 0x1f) * 255) / 31;
  const g0: i32 = (((c0 >> 5) & 0x3f) * 255) / 63;
  const b0: i32 = ((c0 & 0x1f) * 255) / 31;
  const r1: i32 = (((c1 >> 11) & 0x1f) * 255) / 31;
  const g1: i32 = (((c1 >> 5) & 0x3f) * 255) / 63;
  const b1: i32 = ((c1 & 0x1f) * 255) / 31;
  palette[0] = <f32>(<f64>r0 / 255.0);
  palette[1] = <f32>(<f64>g0 / 255.0);
  palette[2] = <f32>(<f64>b0 / 255.0);
  palette[3] = 1.0;
  palette[4] = <f32>(<f64>r1 / 255.0);
  palette[5] = <f32>(<f64>g1 / 255.0);
  palette[6] = <f32>(<f64>b1 / 255.0);
  palette[7] = 1.0;
  if (c0 > c1) {
    const p2r: i32 = (2 * r0 + r1) / 3;
    const p2g: i32 = (2 * g0 + g1) / 3;
    const p2b: i32 = (2 * b0 + b1) / 3;
    const p3r: i32 = (r0 + 2 * r1) / 3;
    const p3g: i32 = (g0 + 2 * g1) / 3;
    const p3b: i32 = (b0 + 2 * b1) / 3;
    palette[8] = <f32>(<f64>p2r / 255.0);
    palette[9] = <f32>(<f64>p2g / 255.0);
    palette[10] = <f32>(<f64>p2b / 255.0);
    palette[11] = 1.0;
    palette[12] = <f32>(<f64>p3r / 255.0);
    palette[13] = <f32>(<f64>p3g / 255.0);
    palette[14] = <f32>(<f64>p3b / 255.0);
    palette[15] = 1.0;
    return false;
  }
  const p2r: i32 = (r0 + r1) >> 1;
  const p2g: i32 = (g0 + g1) >> 1;
  const p2b: i32 = (b0 + b1) >> 1;
  palette[8] = <f32>(<f64>p2r / 255.0);
  palette[9] = <f32>(<f64>p2g / 255.0);
  palette[10] = <f32>(<f64>p2b / 255.0);
  palette[11] = 1.0;
  palette[12] = 0.0;
  palette[13] = 0.0;
  palette[14] = 0.0;
  palette[15] = 0.0;
  return true;
}

function buildBc1PaletteSrgb(palette: StaticArray<f32>, palSrgb: StaticArray<f32>): void {
  for (let k = 0; k < 4; k++) {
    palSrgb[k * 3] = <f32>linearToSrgbF(<f64>palette[k * 4]);
    palSrgb[k * 3 + 1] = <f32>linearToSrgbF(<f64>palette[k * 4 + 1]);
    palSrgb[k * 3 + 2] = <f32>linearToSrgbF(<f64>palette[k * 4 + 2]);
  }
}

function evaluateBc1Mode(
  c0: i32,
  c1: i32,
  palette: StaticArray<f32>,
  palSrgb: StaticArray<f32>,
): f64 {
  const idx3 = buildBc1Palette(c0, c1, palette);
  buildBc1PaletteSrgb(palette, palSrgb);
  const pr0v = f64x2.splat(<f64>palSrgb[0]);
  const pg0v = f64x2.splat(<f64>palSrgb[1]);
  const pb0v = f64x2.splat(<f64>palSrgb[2]);
  const pr1v = f64x2.splat(<f64>palSrgb[3]);
  const pg1v = f64x2.splat(<f64>palSrgb[4]);
  const pb1v = f64x2.splat(<f64>palSrgb[5]);
  const pr2v = f64x2.splat(<f64>palSrgb[6]);
  const pg2v = f64x2.splat(<f64>palSrgb[7]);
  const pb2v = f64x2.splat(<f64>palSrgb[8]);
  let error: f64 = 0.0;
  const baseR = changetype<usize>(blockSrgbR64);
  const baseG = changetype<usize>(blockSrgbG64);
  const baseB = changetype<usize>(blockSrgbB64);
  if (idx3) {
    for (let i = 0; i < 16; i += 2) {
      const offA = i * 4;
      const offB = (i + 1) * 4;
      const skipA = <f64>blockPixels[offA + 3] < 0.5;
      const skipB = <f64>blockPixels[offB + 3] < 0.5;
      if (skipA && skipB) continue;
      const byteOff = <usize>(i * 8);
      const srp = v128.load(baseR + byteOff);
      const sgp = v128.load(baseG + byteOff);
      const sbp = v128.load(baseB + byteOff);
      const dr0 = f64x2.sub(srp, pr0v);
      const dg0 = f64x2.sub(sgp, pg0v);
      const db0 = f64x2.sub(sbp, pb0v);
      const d0 = f64x2.add(
        f64x2.add(f64x2.mul(dr0, dr0), f64x2.mul(dg0, dg0)),
        f64x2.mul(db0, db0),
      );
      const dr1 = f64x2.sub(srp, pr1v);
      const dg1 = f64x2.sub(sgp, pg1v);
      const db1 = f64x2.sub(sbp, pb1v);
      const d1 = f64x2.add(
        f64x2.add(f64x2.mul(dr1, dr1), f64x2.mul(dg1, dg1)),
        f64x2.mul(db1, db1),
      );
      const dr2 = f64x2.sub(srp, pr2v);
      const dg2 = f64x2.sub(sgp, pg2v);
      const db2 = f64x2.sub(sbp, pb2v);
      const d2 = f64x2.add(
        f64x2.add(f64x2.mul(dr2, dr2), f64x2.mul(dg2, dg2)),
        f64x2.mul(db2, db2),
      );
      const best = f64x2.pmin(f64x2.pmin(d0, d1), d2);
      if (!skipA) error += f64x2.extract_lane(best, 0);
      if (!skipB) error += f64x2.extract_lane(best, 1);
    }
  } else {
    const pr3v = f64x2.splat(<f64>palSrgb[9]);
    const pg3v = f64x2.splat(<f64>palSrgb[10]);
    const pb3v = f64x2.splat(<f64>palSrgb[11]);
    for (let i = 0; i < 16; i += 2) {
      const byteOff = <usize>(i * 8);
      const srp = v128.load(baseR + byteOff);
      const sgp = v128.load(baseG + byteOff);
      const sbp = v128.load(baseB + byteOff);
      const dr0 = f64x2.sub(srp, pr0v);
      const dg0 = f64x2.sub(sgp, pg0v);
      const db0 = f64x2.sub(sbp, pb0v);
      const d0 = f64x2.add(
        f64x2.add(f64x2.mul(dr0, dr0), f64x2.mul(dg0, dg0)),
        f64x2.mul(db0, db0),
      );
      const dr1 = f64x2.sub(srp, pr1v);
      const dg1 = f64x2.sub(sgp, pg1v);
      const db1 = f64x2.sub(sbp, pb1v);
      const d1 = f64x2.add(
        f64x2.add(f64x2.mul(dr1, dr1), f64x2.mul(dg1, dg1)),
        f64x2.mul(db1, db1),
      );
      const dr2 = f64x2.sub(srp, pr2v);
      const dg2 = f64x2.sub(sgp, pg2v);
      const db2 = f64x2.sub(sbp, pb2v);
      const d2 = f64x2.add(
        f64x2.add(f64x2.mul(dr2, dr2), f64x2.mul(dg2, dg2)),
        f64x2.mul(db2, db2),
      );
      const dr3 = f64x2.sub(srp, pr3v);
      const dg3 = f64x2.sub(sgp, pg3v);
      const db3 = f64x2.sub(sbp, pb3v);
      const d3 = f64x2.add(
        f64x2.add(f64x2.mul(dr3, dr3), f64x2.mul(dg3, dg3)),
        f64x2.mul(db3, db3),
      );
      const best = f64x2.pmin(f64x2.pmin(f64x2.pmin(d0, d1), d2), d3);
      error += f64x2.extract_lane(best, 0);
      error += f64x2.extract_lane(best, 1);
    }
  }
  evalIdx3 = idx3;
  return error;
}

function lsRefit(palSrgb: StaticArray<f32>, idx3IsTransparent: bool): bool {
  let s00r: f64 = 0.0,
    s01r: f64 = 0.0,
    s11r: f64 = 0.0,
    s0r: f64 = 0.0,
    s1r: f64 = 0.0;
  let s00g: f64 = 0.0,
    s01g: f64 = 0.0,
    s11g: f64 = 0.0,
    s0g: f64 = 0.0,
    s1g: f64 = 0.0;
  let s00b: f64 = 0.0,
    s01b: f64 = 0.0,
    s11b: f64 = 0.0,
    s0b: f64 = 0.0,
    s1b: f64 = 0.0;
  const pr01 = f64x2(<f64>palSrgb[0], <f64>palSrgb[3]);
  const pg01 = f64x2(<f64>palSrgb[1], <f64>palSrgb[4]);
  const pb01 = f64x2(<f64>palSrgb[2], <f64>palSrgb[5]);
  const pr2 = <f64>palSrgb[6];
  const pg2 = <f64>palSrgb[7];
  const pb2 = <f64>palSrgb[8];
  const pr3 = <f64>palSrgb[9];
  const pg3 = <f64>palSrgb[10];
  const pb3 = <f64>palSrgb[11];
  for (let i = 0; i < 16; i++) {
    const off = i * 4;
    if (<f64>blockPixels[off + 3] < 0.5 && idx3IsTransparent) continue;
    const wOff = i * 3;
    const wr = <f64>blockWeights[wOff];
    const wg = <f64>blockWeights[wOff + 1];
    const wb = <f64>blockWeights[wOff + 2];
    const sr = <f64>blockSrgb[wOff];
    const sg = <f64>blockSrgb[wOff + 1];
    const sb = <f64>blockSrgb[wOff + 2];
    const srv = f64x2.splat(sr);
    const sgv = f64x2.splat(sg);
    const sbv = f64x2.splat(sb);
    const dr01 = f64x2.sub(srv, pr01);
    const dg01 = f64x2.sub(sgv, pg01);
    const db01 = f64x2.sub(sbv, pb01);
    const d01 = f64x2.add(
      f64x2.add(f64x2.mul(dr01, dr01), f64x2.mul(dg01, dg01)),
      f64x2.mul(db01, db01),
    );
    const d0 = f64x2.extract_lane(d01, 0);
    const d1 = f64x2.extract_lane(d01, 1);
    const dr2 = sr - pr2;
    const dg2 = sg - pg2;
    const db2 = sb - pb2;
    const d2 = dr2 * dr2 + dg2 * dg2 + db2 * db2;
    let bestK = 0;
    let bestDist = d0;
    if (d1 < bestDist) {
      bestDist = d1;
      bestK = 1;
    }
    if (d2 < bestDist) {
      bestDist = d2;
      bestK = 2;
    }
    if (!idx3IsTransparent) {
      const dr3 = sr - pr3;
      const dg3 = sg - pg3;
      const db3 = sb - pb3;
      const d3 = dr3 * dr3 + dg3 * dg3 + db3 * db3;
      if (d3 < bestDist) {
        bestDist = d3;
        bestK = 3;
      }
    }
    let w0: f64;
    let w1: f64;
    if (idx3IsTransparent) {
      if (bestK == 0) {
        w0 = 1.0;
        w1 = 0.0;
      } else if (bestK == 1) {
        w0 = 0.0;
        w1 = 1.0;
      } else {
        w0 = 0.5;
        w1 = 0.5;
      }
    } else {
      if (bestK == 0) {
        w0 = 1.0;
        w1 = 0.0;
      } else if (bestK == 1) {
        w0 = 0.0;
        w1 = 1.0;
      } else if (bestK == 2) {
        w0 = 2.0 / 3.0;
        w1 = 1.0 / 3.0;
      } else {
        w0 = 1.0 / 3.0;
        w1 = 2.0 / 3.0;
      }
    }
    const w00 = w0 * w0;
    const w01 = w0 * w1;
    const w11 = w1 * w1;
    const r = <f64>blockPixels[off];
    const g = <f64>blockPixels[off + 1];
    const b = <f64>blockPixels[off + 2];
    s00r += wr * w00;
    s01r += wr * w01;
    s11r += wr * w11;
    s0r += wr * w0 * r;
    s1r += wr * w1 * r;
    s00g += wg * w00;
    s01g += wg * w01;
    s11g += wg * w11;
    s0g += wg * w0 * g;
    s1g += wg * w1 * g;
    s00b += wb * w00;
    s01b += wb * w01;
    s11b += wb * w11;
    s0b += wb * w0 * b;
    s1b += wb * w1 * b;
  }
  const detR = s00r * s11r - s01r * s01r;
  const detG = s00g * s11g - s01g * s01g;
  const detB = s00b * s11b - s01b * s01b;
  if (detR <= 1e-9 || detG <= 1e-9 || detB <= 1e-9) return false;
  refitE0r = clamp01((s11r * s0r - s01r * s1r) / detR);
  refitE0g = clamp01((s11g * s0g - s01g * s1g) / detG);
  refitE0b = clamp01((s11b * s0b - s01b * s1b) / detB);
  refitE1r = clamp01((s00r * s1r - s01r * s0r) / detR);
  refitE1g = clamp01((s00g * s1g - s01g * s0g) / detG);
  refitE1b = clamp01((s00b * s1b - s01b * s0b) / detB);
  return true;
}

function quantizeAndOrder(
  e0r: f64,
  e0g: f64,
  e0b: f64,
  e1r: f64,
  e1g: f64,
  e1b: f64,
  threeColor: bool,
): u32 {
  let c0 = rgb565QuantizeF(e0r, e0g, e0b);
  let c1 = rgb565QuantizeF(e1r, e1g, e1b);
  if (threeColor) {
    if (c0 > c1) {
      const t = c0;
      c0 = c1;
      c1 = t;
    }
  } else {
    if (c0 < c1) {
      const t = c0;
      c0 = c1;
      c1 = t;
    }
    if (c0 == c1) {
      if (c0 < 0xffff) c0++;
      else c1--;
    }
  }
  return (<u32>(c0 & 0xffff)) | ((<u32>(c1 & 0xffff)) << 16);
}

function perturbRgb565(c: i32, channel: i32, delta: i32): i32 {
  let r = (c >> 11) & 0x1f;
  let g = (c >> 5) & 0x3f;
  let b = c & 0x1f;
  if (channel == 0) {
    const nr = r + delta;
    if (nr < 0 || nr > 31) return -1;
    r = nr;
  } else if (channel == 1) {
    const ng = g + delta;
    if (ng < 0 || ng > 63) return -1;
    g = ng;
  } else {
    const nb = b + delta;
    if (nb < 0 || nb > 31) return -1;
    b = nb;
  }
  return ((r << 11) | (g << 5) | b) & 0xffff;
}

function consider(
  e0r: f64,
  e0g: f64,
  e0b: f64,
  e1r: f64,
  e1g: f64,
  e1b: f64,
  threeColor: bool,
): void {
  const r0 = clamp01(e0r);
  const g0 = clamp01(e0g);
  const b0 = clamp01(e0b);
  const r1 = clamp01(e1r);
  const g1 = clamp01(e1g);
  const b1 = clamp01(e1b);
  const packed0 = quantizeAndOrder(r0, g0, b0, r1, g1, b1, threeColor);
  let c0 = <i32>(packed0 & 0xffff);
  let c1 = <i32>((packed0 >> 16) & 0xffff);
  for (let s = 0; s < seenN; s++) {
    if (seenC0[s] == c0 && seenC1[s] == c1 && seenT[s] == threeColor) return;
  }
  if (seenN < 16) {
    seenC0[seenN] = c0;
    seenC1[seenN] = c1;
    seenT[seenN] = threeColor;
    seenN++;
  }
  let curError = evaluateBc1Mode(c0, c1, altPal, altPalSrgb);
  let curIdx3 = threeColor;
  for (let iter = 0; iter < 4; iter++) {
    if (!lsRefit(altPalSrgb, curIdx3)) break;
    const packed = quantizeAndOrder(
      refitE0r,
      refitE0g,
      refitE0b,
      refitE1r,
      refitE1g,
      refitE1b,
      threeColor,
    );
    const nc0 = <i32>(packed & 0xffff);
    const nc1 = <i32>((packed >> 16) & 0xffff);
    if (nc0 == c0 && nc1 == c1) break;
    const newErr = evaluateBc1Mode(nc0, nc1, altPal, altPalSrgb);
    if (newErr >= curError) {
      evaluateBc1Mode(c0, c1, altPal, altPalSrgb);
      break;
    }
    c0 = nc0;
    c1 = nc1;
    curError = newErr;
    curIdx3 = evalIdx3;
  }
  if (!haveBestOut || curError < bestErrOut) {
    bestC0Out = c0;
    bestC1Out = c1;
    bestErrOut = curError;
    bestIdx3Out = curIdx3;
    haveBestOut = true;
    for (let i = 0; i < 16; i++) bestPal[i] = altPal[i];
    for (let i = 0; i < 12; i++) bestPalSrgb[i] = altPalSrgb[i];
  }
}

function refineBc1Endpoints(): void {
  let bestC0 = bestC0Out;
  let bestC1 = bestC1Out;
  let bestErr = bestErrOut;
  const idx3 = bestIdx3Out;
  for (let round = 0; round < 4; round++) {
    let improved = false;
    for (let which = 0; which < 2; which++) {
      for (let channel = 0; channel < 3; channel++) {
        for (let d = -1; d <= 1; d += 2) {
          let nc0 = bestC0;
          let nc1 = bestC1;
          if (which == 0) {
            const p = perturbRgb565(bestC0, channel, d);
            if (p < 0) continue;
            nc0 = p;
          } else {
            const p = perturbRgb565(bestC1, channel, d);
            if (p < 0) continue;
            nc1 = p;
          }
          if (idx3) {
            if (nc0 > nc1) continue;
          } else {
            if (nc0 <= nc1) continue;
          }
          const err = evaluateBc1Mode(nc0, nc1, altPal, altPalSrgb);
          if (evalIdx3 != idx3) continue;
          if (err < bestErr) {
            bestC0 = nc0;
            bestC1 = nc1;
            bestErr = err;
            for (let i = 0; i < 16; i++) bestPal[i] = altPal[i];
            for (let i = 0; i < 12; i++) bestPalSrgb[i] = altPalSrgb[i];
            improved = true;
          }
        }
      }
    }
    if (!improved) break;
  }
  bestC0Out = bestC0;
  bestC1Out = bestC1;
  bestErrOut = bestErr;
}

function chooseBc1Endpoints(allowAlpha: bool, bc1Mode: i32): void {
  let n = 0;
  let mr: f64 = 0.0;
  let mg: f64 = 0.0;
  let mb: f64 = 0.0;
  let minR: f64 = f64.MAX_VALUE;
  let minG: f64 = f64.MAX_VALUE;
  let minB: f64 = f64.MAX_VALUE;
  let maxR: f64 = -f64.MAX_VALUE;
  let maxG: f64 = -f64.MAX_VALUE;
  let maxB: f64 = -f64.MAX_VALUE;
  let hasAlpha = false;
  for (let i = 0; i < 16; i++) {
    const off = i * 4;
    if (<f64>blockPixels[off + 3] < 0.5) {
      hasAlpha = true;
      continue;
    }
    n++;
    const r = <f64>blockPixels[off];
    const g = <f64>blockPixels[off + 1];
    const b = <f64>blockPixels[off + 2];
    mr += r;
    mg += g;
    mb += b;
    if (r < minR) minR = r;
    if (g < minG) minG = g;
    if (b < minB) minB = b;
    if (r > maxR) maxR = r;
    if (g > maxG) maxG = g;
    if (b > maxB) maxB = b;
  }
  if (n == 0) {
    bestC0Out = 0;
    bestC1Out = 0xffff;
    bestIdx3Out = true;
    bestErrOut = 0.0;
    haveBestOut = true;
    buildBc1Palette(0, 0xffff, bestPal);
    buildBc1PaletteSrgb(bestPal, bestPalSrgb);
    return;
  }
  mr /= <f64>n;
  mg /= <f64>n;
  mb /= <f64>n;

  let cxx: f64 = 0.0,
    cxy: f64 = 0.0,
    cxz: f64 = 0.0;
  let cyy: f64 = 0.0,
    cyz: f64 = 0.0,
    czz: f64 = 0.0;
  for (let i = 0; i < 16; i++) {
    const off = i * 4;
    if (<f64>blockPixels[off + 3] < 0.5) continue;
    const dr = <f64>blockPixels[off] - mr;
    const dg = <f64>blockPixels[off + 1] - mg;
    const db = <f64>blockPixels[off + 2] - mb;
    cxx += dr * dr;
    cxy += dr * dg;
    cxz += dr * db;
    cyy += dg * dg;
    cyz += dg * db;
    czz += db * db;
  }
  let ax: f64 = 1.0;
  let ay: f64 = 1.0;
  let az: f64 = 1.0;
  for (let it = 0; it < 8; it++) {
    const nx = cxx * ax + cxy * ay + cxz * az;
    const ny = cxy * ax + cyy * ay + cyz * az;
    const nz = cxz * ax + cyz * ay + czz * az;
    const ax_ = Math.abs(nx);
    const ay_ = Math.abs(ny);
    const az_ = Math.abs(nz);
    let m = ax_;
    if (ay_ > m) m = ay_;
    if (az_ > m) m = az_;
    if (m == 0.0) {
      ax = 1.0;
      ay = 1.0;
      az = 1.0;
      break;
    }
    ax = nx / m;
    ay = ny / m;
    az = nz / m;
  }
  const norm = Math.sqrt(ax * ax + ay * ay + az * az);
  if (norm > 0.0) {
    ax /= norm;
    ay /= norm;
    az /= norm;
  }

  let minP: f64 = f64.MAX_VALUE;
  let maxP: f64 = -f64.MAX_VALUE;
  for (let i = 0; i < 16; i++) {
    const off = i * 4;
    if (<f64>blockPixels[off + 3] < 0.5) continue;
    const dr = <f64>blockPixels[off] - mr;
    const dg = <f64>blockPixels[off + 1] - mg;
    const db = <f64>blockPixels[off + 2] - mb;
    const p = dr * ax + dg * ay + db * az;
    if (p < minP) minP = p;
    if (p > maxP) maxP = p;
  }

  const requireThreeColor = allowAlpha && hasAlpha;
  const tryFour = !requireThreeColor && bc1Mode != <i32>Bc1Mode.ThreeColor;
  const tryThree = bc1Mode != <i32>Bc1Mode.FourColor || requireThreeColor;

  bestC0Out = 0;
  bestC1Out = 0;
  bestErrOut = f64.MAX_VALUE;
  bestIdx3Out = false;
  haveBestOut = false;
  seenN = 0;

  if (tryFour) {
    consider(maxR, maxG, maxB, minR, minG, minB, false);
    for (let ki = 0; ki < 3; ki++) {
      const k = PCA_K[ki];
      consider(
        mr + maxP * ax * k,
        mg + maxP * ay * k,
        mb + maxP * az * k,
        mr + minP * ax * k,
        mg + minP * ay * k,
        mb + minP * az * k,
        false,
      );
    }
  }

  if (tryThree) {
    for (let ki = 0; ki < 3; ki++) {
      const k = PCA_K[ki];
      consider(
        mr + maxP * ax * k,
        mg + maxP * ay * k,
        mb + maxP * az * k,
        mr + minP * ax * k,
        mg + minP * ay * k,
        mb + minP * az * k,
        true,
      );
    }
    consider(maxR, maxG, maxB, minR, minG, minB, true);
  }

  if (!haveBestOut) {
    consider(
      mr + maxP * ax,
      mg + maxP * ay,
      mb + maxP * az,
      mr + minP * ax,
      mg + minP * ay,
      mb + minP * az,
      false,
    );
  }

  refineBc1Endpoints();
}

function bc1AssignIndex(sr: f64, sg: f64, sb: f64, a: f64, idx3IsTransparent: bool): i32 {
  if (a < 0.5 && idx3IsTransparent) return 3;
  const pr01 = f64x2(<f64>bestPalSrgb[0], <f64>bestPalSrgb[3]);
  const pg01 = f64x2(<f64>bestPalSrgb[1], <f64>bestPalSrgb[4]);
  const pb01 = f64x2(<f64>bestPalSrgb[2], <f64>bestPalSrgb[5]);
  const srv = f64x2.splat(sr);
  const sgv = f64x2.splat(sg);
  const sbv = f64x2.splat(sb);
  const dr01 = f64x2.sub(srv, pr01);
  const dg01 = f64x2.sub(sgv, pg01);
  const db01 = f64x2.sub(sbv, pb01);
  const d01 = f64x2.add(
    f64x2.add(f64x2.mul(dr01, dr01), f64x2.mul(dg01, dg01)),
    f64x2.mul(db01, db01),
  );
  const d0 = f64x2.extract_lane(d01, 0);
  const d1 = f64x2.extract_lane(d01, 1);
  const pr2 = <f64>bestPalSrgb[6];
  const pg2 = <f64>bestPalSrgb[7];
  const pb2 = <f64>bestPalSrgb[8];
  const dr2 = sr - pr2;
  const dg2 = sg - pg2;
  const db2 = sb - pb2;
  const d2 = dr2 * dr2 + dg2 * dg2 + db2 * db2;
  let best = 0;
  let bestDist = d0;
  if (d1 < bestDist) {
    bestDist = d1;
    best = 1;
  }
  if (d2 < bestDist) {
    bestDist = d2;
    best = 2;
  }
  if (!idx3IsTransparent) {
    const pr3 = <f64>bestPalSrgb[9];
    const pg3 = <f64>bestPalSrgb[10];
    const pb3 = <f64>bestPalSrgb[11];
    const dr3 = sr - pr3;
    const dg3 = sg - pg3;
    const db3 = sb - pb3;
    const d3 = dr3 * dr3 + dg3 * dg3 + db3 * db3;
    if (d3 < bestDist) {
      bestDist = d3;
      best = 3;
    }
  }
  return best;
}

function bcColorEncode(
  linRgbaPtr: usize,
  srgbRgbaPtr: usize,
  outPtr: usize,
  texW: i32,
  texH: i32,
  bc1Mode: i32,
  allowAlphaMode: bool,
  bytesPerBlock: i32,
  colorOffset: i32,
): void {
  const blocksX = texW / 4;
  const blocksY = texH / 4;
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const px = bx * 4 + col;
          const py = by * 4 + row;
          const srcLin = linRgbaPtr + <usize>((py * texW + px) * 16);
          const srcSrgb = srgbRgbaPtr + <usize>((py * texW + px) * 4);
          const dst = (row * 4 + col) * 4;
          const wDst = (row * 4 + col) * 3;
          const r = load<f32>(srcLin);
          const g = load<f32>(srcLin + 4);
          const b = load<f32>(srcLin + 8);
          const a = allowAlphaMode ? load<f32>(srcLin + 12) : <f32>1.0;
          blockPixels[dst] = r;
          blockPixels[dst + 1] = g;
          blockPixels[dst + 2] = b;
          blockPixels[dst + 3] = a;
          blockSrgb[wDst] = <f32>(<f64>load<u8>(srcSrgb) / 255.0);
          blockSrgb[wDst + 1] = <f32>(<f64>load<u8>(srcSrgb + 1) / 255.0);
          blockSrgb[wDst + 2] = <f32>(<f64>load<u8>(srcSrgb + 2) / 255.0);
          blockWeights[wDst] = <f32>gammaWeight(<f64>r);
          blockWeights[wDst + 1] = <f32>gammaWeight(<f64>g);
          blockWeights[wDst + 2] = <f32>gammaWeight(<f64>b);
        }
      }
      for (let i = 0; i < 16; i++) {
        const sOff = i * 3;
        blockSrgbR64[i] = <f64>blockSrgb[sOff];
        blockSrgbG64[i] = <f64>blockSrgb[sOff + 1];
        blockSrgbB64[i] = <f64>blockSrgb[sOff + 2];
      }
      chooseBc1Endpoints(allowAlphaMode, bc1Mode);
      let indices: u32 = 0;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const bIdx = (row * 4 + col) * 4;
          const sIdx = (row * 4 + col) * 3;
          const k = bc1AssignIndex(
            <f64>blockSrgb[sIdx],
            <f64>blockSrgb[sIdx + 1],
            <f64>blockSrgb[sIdx + 2],
            <f64>blockPixels[bIdx + 3],
            bestIdx3Out,
          );
          indices = indices | ((<u32>k) << (<u32>(2 * (row * 4 + col))));
        }
      }
      const o = outPtr + <usize>((by * blocksX + bx) * bytesPerBlock + colorOffset);
      store<u16>(o, <u16>bestC0Out);
      store<u16>(o + 2, <u16>bestC1Out);
      store<u32>(o + 4, indices);
    }
  }
}

export function bc1EncodeImpl(
  linRgbaPtr: usize,
  srgbRgbaPtr: usize,
  outPtr: usize,
  texW: i32,
  texH: i32,
  bc1Mode: i32,
): void {
  bcColorEncode(linRgbaPtr, srgbRgbaPtr, outPtr, texW, texH, bc1Mode, true, 8, 0);
}

export function bc3EncodeImpl(
  linRgbaPtr: usize,
  srgbRgbaPtr: usize,
  outPtr: usize,
  texW: i32,
  texH: i32,
): void {
  bcColorEncode(linRgbaPtr, srgbRgbaPtr, outPtr, texW, texH, <i32>Bc1Mode.FourColor, false, 16, 8);
  const blocksX = texW / 4;
  const blocksY = texH / 4;
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let minA: f64 = 1.0;
      let maxA: f64 = 0.0;
      let innerMin: f64 = 1.0;
      let innerMax: f64 = 0.0;
      let hasInner = false;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const a = <f64>(
            load<f32>(linRgbaPtr + <usize>(((by * 4 + row) * texW + (bx * 4 + col)) * 16 + 12))
          );
          blockA[row * 4 + col] = <f32>a;
          if (a < minA) minA = a;
          if (a > maxA) maxA = a;
          if (a > 0.0 && a < 1.0) {
            if (a < innerMin) innerMin = a;
            if (a > innerMax) innerMax = a;
            hasInner = true;
          }
        }
      }
      const a0_8 = <i32>Math.round(maxA * 255.0);
      const a1_8 = <i32>Math.round(minA * 255.0);
      pal8[0] = <f32>(<f64>a0_8 / 255.0);
      pal8[1] = <f32>(<f64>a1_8 / 255.0);
      if (a0_8 > a1_8) {
        pal8[2] = <f32>(<f64>(6 * a0_8 + 1 * a1_8) / 7.0 / 255.0);
        pal8[3] = <f32>(<f64>(5 * a0_8 + 2 * a1_8) / 7.0 / 255.0);
        pal8[4] = <f32>(<f64>(4 * a0_8 + 3 * a1_8) / 7.0 / 255.0);
        pal8[5] = <f32>(<f64>(3 * a0_8 + 4 * a1_8) / 7.0 / 255.0);
        pal8[6] = <f32>(<f64>(2 * a0_8 + 5 * a1_8) / 7.0 / 255.0);
        pal8[7] = <f32>(<f64>(1 * a0_8 + 6 * a1_8) / 7.0 / 255.0);
      } else {
        for (let k = 2; k < 8; k++) pal8[k] = pal8[0];
      }

      const sixSrcMin = hasInner ? innerMin : minA;
      const sixSrcMax = hasInner ? innerMax : maxA;
      const a0_6 = <i32>Math.round(sixSrcMin * 255.0);
      const a1_6 = <i32>Math.round(sixSrcMax * 255.0);
      const useSix = a0_6 < a1_6;
      if (useSix) {
        pal6[0] = <f32>(<f64>a0_6 / 255.0);
        pal6[1] = <f32>(<f64>a1_6 / 255.0);
        pal6[2] = <f32>(<f64>(4 * a0_6 + 1 * a1_6) / 5.0 / 255.0);
        pal6[3] = <f32>(<f64>(3 * a0_6 + 2 * a1_6) / 5.0 / 255.0);
        pal6[4] = <f32>(<f64>(2 * a0_6 + 3 * a1_6) / 5.0 / 255.0);
        pal6[5] = <f32>(<f64>(1 * a0_6 + 4 * a1_6) / 5.0 / 255.0);
        pal6[6] = 0.0;
        pal6[7] = 1.0;
      }

      let err8: f64 = 0.0;
      let err6: f64 = 0.0;
      for (let i = 0; i < 16; i++) {
        const a = <f64>blockA[i];
        let b8 = 0;
        let d8 = (a - <f64>pal8[0]) * (a - <f64>pal8[0]);
        for (let k = 1; k < 8; k++) {
          const dv = a - <f64>pal8[k];
          const d = dv * dv;
          if (d < d8) {
            d8 = d;
            b8 = k;
          }
        }
        idx8[i] = <u8>b8;
        err8 += d8;
        if (useSix) {
          let b6 = 0;
          let d6 = (a - <f64>pal6[0]) * (a - <f64>pal6[0]);
          for (let k = 1; k < 8; k++) {
            const dv = a - <f64>pal6[k];
            const d = dv * dv;
            if (d < d6) {
              d6 = d;
              b6 = k;
            }
          }
          idx6[i] = <u8>b6;
          err6 += d6;
        }
      }

      const sixWins = useSix && err6 < err8;
      const a0Out = sixWins ? a0_6 : a0_8;
      const a1Out = sixWins ? a1_6 : a1_8;
      let alphaIdxBits: u64 = 0;
      if (sixWins) {
        for (let i = 0; i < 16; i++) {
          alphaIdxBits |= (<u64>idx6[i]) << (<u64>(3 * i));
        }
      } else {
        for (let i = 0; i < 16; i++) {
          alphaIdxBits |= (<u64>idx8[i]) << (<u64>(3 * i));
        }
      }
      const o = outPtr + <usize>((by * blocksX + bx) * 16);
      store<u8>(o, <u8>a0Out);
      store<u8>(o + 1, <u8>a1Out);
      for (let i = 0; i < 6; i++) {
        store<u8>(o + 2 + <usize>i, <u8>((alphaIdxBits >> (<u64>(8 * i))) & 0xff));
      }
    }
  }
}
