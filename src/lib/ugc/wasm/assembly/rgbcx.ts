import {
  NUM_UNIQUE_TOTAL_ORDERINGS4,
  NUM_UNIQUE_TOTAL_ORDERINGS3,
  MAX_TOTAL_ORDERINGS4,
  UNIQUE_ORDERS4,
  UNIQUE_ORDERS3,
  BEST_ORDERINGS3,
  BEST_ORDERINGS4,
} from './rgbcx_tables';

const TOTAL_ORDER_4_0_16: i32 = 15;
const TOTAL_ORDER_4_1_16: i32 = 700;
const TOTAL_ORDER_4_2_16: i32 = 753;
const TOTAL_ORDER_4_3_16: i32 = 515;
const TOTAL_ORDER_3_0_16: i32 = 12;
const TOTAL_ORDER_3_1_16: i32 = 15;
const TOTAL_ORDER_3_2_16: i32 = 89;

const ENDPOINT_SEARCH_ROUNDS: i32 = 256;
const TOTAL_ORDERINGS_4: i32 = 128;
const TOTAL_ORDERINGS_3: i32 = 32;

const match5eqHi = new StaticArray<u8>(256);
const match5eqLo = new StaticArray<u8>(256);
const match5eqE = new StaticArray<u8>(256);
const match6eqHi = new StaticArray<u8>(256);
const match6eqLo = new StaticArray<u8>(256);
const match6eqE = new StaticArray<u8>(256);
const match5halfHi = new StaticArray<u8>(256);
const match5halfLo = new StaticArray<u8>(256);
const match5halfE = new StaticArray<u8>(256);
const match6halfHi = new StaticArray<u8>(256);
const match6halfLo = new StaticArray<u8>(256);
const match6halfE = new StaticArray<u8>(256);

const ordering4Hash = new StaticArray<u16>(4096);
const ordering3Hash = new StaticArray<u16>(256);
const selectorFactors4 = new StaticArray<f32>(NUM_UNIQUE_TOTAL_ORDERINGS4 * 3);
const selectorFactors3 = new StaticArray<f32>(NUM_UNIQUE_TOTAL_ORDERINGS3 * 3);

const midpoint5 = new StaticArray<f32>(32);
const midpoint6 = new StaticArray<f32>(64);

const WEIGHT_VALS4 = new StaticArray<i32>(4);
const WEIGHT_VALS3 = new StaticArray<i32>(3);

let initialized: bool = false;
let g_transparentMask: i32 = 0;

const pxR = new StaticArray<i32>(16);
const pxG = new StaticArray<i32>(16);
const pxB = new StaticArray<i32>(16);

const trialSels = new StaticArray<u8>(16);
const sels = new StaticArray<u8>(16);
const roundSels = new StaticArray<u8>(16);
const trialSels2 = new StaticArray<u8>(16);

const dotsBuf = new StaticArray<i32>(16);
const rSum = new StaticArray<i32>(17);
const gSum = new StaticArray<i32>(17);
const bSum = new StaticArray<i32>(17);

let resLr: i32 = 0;
let resLg: i32 = 0;
let resLb: i32 = 0;
let resHr: i32 = 0;
let resHg: i32 = 0;
let resHb: i32 = 0;
let res3Color: bool = false;

let xlR: f32 = 0;
let xlG: f32 = 0;
let xlB: f32 = 0;
let xhR: f32 = 0;
let xhG: f32 = 0;
let xhB: f32 = 0;

let prRoundLr: i32 = 0;
let prRoundLg: i32 = 0;
let prRoundLb: i32 = 0;
let prRoundHr: i32 = 0;
let prRoundHg: i32 = 0;
let prRoundHb: i32 = 0;

@inline function clampi(v: i32, lo: i32, hi: i32): i32 {
  return v < lo ? lo : v > hi ? hi : v;
}
@inline function clamp31(v: i32): i32 {
  return v < 0 ? 0 : v > 31 ? 31 : v;
}
@inline function clamp63(v: i32): i32 {
  return v < 0 ? 0 : v > 63 ? 63 : v;
}

@inline function to5(v: i32): i32 {
  const x = v * 31 + 128;
  return (x + (x >> 8)) >> 8;
}
@inline function to6(v: i32): i32 {
  const x = v * 63 + 128;
  return (x + (x >> 8)) >> 8;
}

function prepareSingleColorTable(
  hiOut: StaticArray<u8>,
  loOut: StaticArray<u8>,
  eOut: StaticArray<u8>,
  expand: StaticArray<u8>,
  size: i32,
): void {
  for (let i = 0; i < 256; i++) {
    let lowestE: i32 = 256;
    for (let lo = 0; lo < size; lo++) {
      const loE: i32 = <i32>unchecked(expand[lo]);
      for (let hi = 0; hi < size; hi++) {
        const hiE: i32 = <i32>unchecked(expand[hi]);
        const v: i32 = (hiE * 2 + loE) / 3;
        const spread: i32 = hiE > loE ? hiE - loE : loE - hiE;
        const diff: i32 = v > i ? v - i : i - v;
        const e: i32 = diff + (spread * 3) / 100;
        if (e < lowestE || (e == lowestE && lo == hi)) {
          unchecked((hiOut[i] = <u8>hi));
          unchecked((loOut[i] = <u8>lo));
          unchecked((eOut[i] = <u8>e));
          lowestE = e;
        }
      }
    }
  }
}

function prepareSingleColorTableHalf(
  hiOut: StaticArray<u8>,
  loOut: StaticArray<u8>,
  eOut: StaticArray<u8>,
  expand: StaticArray<u8>,
  size: i32,
): void {
  for (let i = 0; i < 256; i++) {
    let lowestE: i32 = 256;
    for (let lo = 0; lo < size; lo++) {
      const loE: i32 = <i32>unchecked(expand[lo]);
      for (let hi = 0; hi < size; hi++) {
        const hiE: i32 = <i32>unchecked(expand[hi]);
        const v: i32 = (hiE + loE) / 2;
        const spread: i32 = hiE > loE ? hiE - loE : loE - hiE;
        const diff: i32 = v > i ? v - i : i - v;
        const e: i32 = diff + (spread * 3) / 100;
        if (e < lowestE || (e == lowestE && lo == hi)) {
          unchecked((hiOut[i] = <u8>hi));
          unchecked((loOut[i] = <u8>lo));
          unchecked((eOut[i] = <u8>e));
          lowestE = e;
        }
      }
    }
  }
}

function computeFactors4(h0: i32, h1: i32, h2: i32, h3: i32, idx: i32): void {
  const wa =
    unchecked(WEIGHT_VALS4[0]) * h0 +
    unchecked(WEIGHT_VALS4[1]) * h1 +
    unchecked(WEIGHT_VALS4[2]) * h2 +
    unchecked(WEIGHT_VALS4[3]) * h3;
  const z00 = <f32>((wa >> 16) & 0xff);
  const z10 = <f32>((wa >> 8) & 0xff);
  const z11 = <f32>(wa & 0xff);
  let det = z00 * z11 - z10 * z10;
  if (Mathf.abs(det) < <f32>1e-8) det = 0;
  else det = <f32>(3.0 / 255.0) / det;
  unchecked((selectorFactors4[idx * 3] = z11 * det));
  unchecked((selectorFactors4[idx * 3 + 1] = -z10 * det));
  unchecked((selectorFactors4[idx * 3 + 2] = z00 * det));
}

function computeFactors3(h0: i32, h1: i32, h2: i32, idx: i32): void {
  const wa =
    unchecked(WEIGHT_VALS3[0]) * h0 +
    unchecked(WEIGHT_VALS3[1]) * h1 +
    unchecked(WEIGHT_VALS3[2]) * h2;
  const z00 = <f32>((wa >> 16) & 0xff);
  const z10 = <f32>((wa >> 8) & 0xff);
  const z11 = <f32>(wa & 0xff);
  let det = z00 * z11 - z10 * z10;
  if (Mathf.abs(det) < <f32>1e-8) det = 0;
  else det = <f32>(2.0 / 255.0) / det;
  unchecked((selectorFactors3[idx * 3] = z11 * det));
  unchecked((selectorFactors3[idx * 3 + 1] = -z10 * det));
  unchecked((selectorFactors3[idx * 3 + 2] = z00 * det));
}

function ensureInit(): void {
  if (initialized) return;

  unchecked((WEIGHT_VALS4[0] = 0x000009));
  unchecked((WEIGHT_VALS4[1] = 0x010204));
  unchecked((WEIGHT_VALS4[2] = 0x040201));
  unchecked((WEIGHT_VALS4[3] = 0x090000));
  unchecked((WEIGHT_VALS3[0] = 0x000004));
  unchecked((WEIGHT_VALS3[1] = 0x040000));
  unchecked((WEIGHT_VALS3[2] = 0x010101));

  const mp5 = StaticArray.fromArray<f32>([
    0.015686, 0.047059, 0.078431, 0.111765, 0.145098, 0.176471, 0.207843, 0.241176, 0.27451,
    0.305882, 0.337255, 0.370588, 0.403922, 0.435294, 0.466667, 0.5, 0.533333, 0.564706, 0.596078,
    0.629412, 0.662745, 0.694118, 0.72549, 0.758824, 0.792157, 0.823529, 0.854902, 0.888235,
    0.921569, 0.952941, 0.984314, 1e37,
  ]);
  for (let i = 0; i < 32; i++) unchecked((midpoint5[i] = unchecked(mp5[i])));

  const mp6 = StaticArray.fromArray<f32>([
    0.007843, 0.023529, 0.039216, 0.054902, 0.070588, 0.086275, 0.101961, 0.117647, 0.133333,
    0.14902, 0.164706, 0.180392, 0.196078, 0.211765, 0.227451, 0.245098, 0.262745, 0.278431,
    0.294118, 0.309804, 0.32549, 0.341176, 0.356863, 0.372549, 0.388235, 0.403922, 0.419608,
    0.435294, 0.45098, 0.466667, 0.482353, 0.5, 0.517647, 0.533333, 0.54902, 0.564706, 0.580392,
    0.596078, 0.611765, 0.627451, 0.643137, 0.658824, 0.67451, 0.690196, 0.705882, 0.721569,
    0.737255, 0.754902, 0.772549, 0.788235, 0.803922, 0.819608, 0.835294, 0.85098, 0.866667,
    0.882353, 0.898039, 0.913725, 0.929412, 0.945098, 0.960784, 0.976471, 0.992157, 1e37,
  ]);
  for (let i = 0; i < 64; i++) unchecked((midpoint6[i] = unchecked(mp6[i])));

  const expand5 = new StaticArray<u8>(32);
  for (let i = 0; i < 32; i++) unchecked((expand5[i] = <u8>((i << 3) | (i >> 2))));
  const expand6 = new StaticArray<u8>(64);
  for (let i = 0; i < 64; i++) unchecked((expand6[i] = <u8>((i << 2) | (i >> 4))));

  prepareSingleColorTable(match5eqHi, match5eqLo, match5eqE, expand5, 32);
  prepareSingleColorTableHalf(match5halfHi, match5halfLo, match5halfE, expand5, 32);
  prepareSingleColorTable(match6eqHi, match6eqLo, match6eqE, expand6, 64);
  prepareSingleColorTableHalf(match6halfHi, match6halfLo, match6halfE, expand6, 64);

  for (let i = 0; i < NUM_UNIQUE_TOTAL_ORDERINGS4; i++) {
    const h0 = <i32>unchecked(UNIQUE_ORDERS4[i * 4]);
    const h1 = <i32>unchecked(UNIQUE_ORDERS4[i * 4 + 1]);
    const h2 = <i32>unchecked(UNIQUE_ORDERS4[i * 4 + 2]);
    const h3 = <i32>unchecked(UNIQUE_ORDERS4[i * 4 + 3]);
    if (h0 != 16 && h1 != 16 && h2 != 16 && h3 != 16) {
      const key = h0 | (h1 << 4) | (h2 << 8);
      unchecked((ordering4Hash[key] = <u16>i));
    }
    computeFactors4(h0, h1, h2, h3, i);
  }
  for (let i = 0; i < NUM_UNIQUE_TOTAL_ORDERINGS3; i++) {
    const h0 = <i32>unchecked(UNIQUE_ORDERS3[i * 3]);
    const h1 = <i32>unchecked(UNIQUE_ORDERS3[i * 3 + 1]);
    const h2 = <i32>unchecked(UNIQUE_ORDERS3[i * 3 + 2]);
    if (h0 != 16 && h1 != 16 && h2 != 16) {
      const key = h0 | (h1 << 4);
      unchecked((ordering3Hash[key] = <u16>i));
    }
    computeFactors3(h0, h1, h2, i);
  }

  initialized = true;
}

@inline function lookupOrder4(h0: i32, h1: i32, h2: i32, h3: i32): i32 {
  if (h0 == 16) return TOTAL_ORDER_4_0_16;
  if (h1 == 16) return TOTAL_ORDER_4_1_16;
  if (h2 == 16) return TOTAL_ORDER_4_2_16;
  if (h3 == 16) return TOTAL_ORDER_4_3_16;
  return <i32>unchecked(ordering4Hash[h0 | (h1 << 4) | (h2 << 8)]);
}

@inline function lookupOrder3(h0: i32, h1: i32, h2: i32): i32 {
  if (h0 == 16) return TOTAL_ORDER_3_0_16;
  if (h1 == 16) return TOTAL_ORDER_3_1_16;
  if (h2 == 16) return TOTAL_ORDER_3_2_16;
  return <i32>unchecked(ordering3Hash[h0 | (h1 << 4)]);
}

const blockR4 = new StaticArray<i32>(4);
const blockG4 = new StaticArray<i32>(4);
const blockB4 = new StaticArray<i32>(4);
const blockR3 = new StaticArray<i32>(3);
const blockG3 = new StaticArray<i32>(3);
const blockB3 = new StaticArray<i32>(3);

@inline function getBlockColors4(
  lr: i32,
  lg: i32,
  lb: i32,
  hr: i32,
  hg: i32,
  hb: i32,
): void {
  const r0 = (lr << 3) | (lr >> 2);
  const g0 = (lg << 2) | (lg >> 4);
  const b0 = (lb << 3) | (lb >> 2);
  const r3 = (hr << 3) | (hr >> 2);
  const g3 = (hg << 2) | (hg >> 4);
  const b3 = (hb << 3) | (hb >> 2);
  unchecked((blockR4[0] = r0));
  unchecked((blockG4[0] = g0));
  unchecked((blockB4[0] = b0));
  unchecked((blockR4[3] = r3));
  unchecked((blockG4[3] = g3));
  unchecked((blockB4[3] = b3));
  unchecked((blockR4[1] = (r0 * 2 + r3) / 3));
  unchecked((blockG4[1] = (g0 * 2 + g3) / 3));
  unchecked((blockB4[1] = (b0 * 2 + b3) / 3));
  unchecked((blockR4[2] = (r3 * 2 + r0) / 3));
  unchecked((blockG4[2] = (g3 * 2 + g0) / 3));
  unchecked((blockB4[2] = (b3 * 2 + b0) / 3));
}

@inline function getBlockColors3(
  lr: i32,
  lg: i32,
  lb: i32,
  hr: i32,
  hg: i32,
  hb: i32,
): void {
  const r0 = (lr << 3) | (lr >> 2);
  const g0 = (lg << 2) | (lg >> 4);
  const b0 = (lb << 3) | (lb >> 2);
  const r1 = (hr << 3) | (hr >> 2);
  const g1 = (hg << 2) | (hg >> 4);
  const b1 = (hb << 3) | (hb >> 2);
  unchecked((blockR3[0] = r0));
  unchecked((blockG3[0] = g0));
  unchecked((blockB3[0] = b0));
  unchecked((blockR3[1] = r1));
  unchecked((blockG3[1] = g1));
  unchecked((blockB3[1] = b1));
  unchecked((blockR3[2] = (r0 + r1) / 2));
  unchecked((blockG3[2] = (g0 + g1) / 2));
  unchecked((blockB3[2] = (b0 + b1) / 2));
}

function findSels4Fullerr(
  outSels: StaticArray<u8>,
  lr: i32,
  lg: i32,
  lb: i32,
  hr: i32,
  hg: i32,
  hb: i32,
  curErr: i32,
): i32 {
  getBlockColors4(lr, lg, lb, hr, hg, hb);
  const c0R = i32x4.splat(unchecked(blockR4[0]));
  const c0G = i32x4.splat(unchecked(blockG4[0]));
  const c0B = i32x4.splat(unchecked(blockB4[0]));
  const c1R = i32x4.splat(unchecked(blockR4[1]));
  const c1G = i32x4.splat(unchecked(blockG4[1]));
  const c1B = i32x4.splat(unchecked(blockB4[1]));
  const c2R = i32x4.splat(unchecked(blockR4[2]));
  const c2G = i32x4.splat(unchecked(blockG4[2]));
  const c2B = i32x4.splat(unchecked(blockB4[2]));
  const c3R = i32x4.splat(unchecked(blockR4[3]));
  const c3G = i32x4.splat(unchecked(blockG4[3]));
  const c3B = i32x4.splat(unchecked(blockB4[3]));
  const pri0V = i32x4.splat(1);
  const pri1V = i32x4.splat(2);
  const pri2V = i32x4.splat(3);
  const pri3V = i32x4.splat(0);
  let total = 0;
  for (let i = 0; i < 16; i += 4) {
    const off = <usize>(i << 2);
    const rV = v128.load(changetype<usize>(pxR) + off);
    const gV = v128.load(changetype<usize>(pxG) + off);
    const bV = v128.load(changetype<usize>(pxB) + off);
    const dr0 = i32x4.sub(c0R, rV);
    const dg0 = i32x4.sub(c0G, gV);
    const db0 = i32x4.sub(c0B, bV);
    const e0 = i32x4.add(i32x4.add(i32x4.mul(dr0, dr0), i32x4.mul(dg0, dg0)), i32x4.mul(db0, db0));
    const p0 = v128.or(i32x4.shl(e0, 2), pri0V);
    const dr1 = i32x4.sub(c1R, rV);
    const dg1 = i32x4.sub(c1G, gV);
    const db1 = i32x4.sub(c1B, bV);
    const e1 = i32x4.add(i32x4.add(i32x4.mul(dr1, dr1), i32x4.mul(dg1, dg1)), i32x4.mul(db1, db1));
    const p1 = v128.or(i32x4.shl(e1, 2), pri1V);
    const dr2 = i32x4.sub(c2R, rV);
    const dg2 = i32x4.sub(c2G, gV);
    const db2 = i32x4.sub(c2B, bV);
    const e2 = i32x4.add(i32x4.add(i32x4.mul(dr2, dr2), i32x4.mul(dg2, dg2)), i32x4.mul(db2, db2));
    const p2 = v128.or(i32x4.shl(e2, 2), pri2V);
    const dr3 = i32x4.sub(c3R, rV);
    const dg3 = i32x4.sub(c3G, gV);
    const db3 = i32x4.sub(c3B, bV);
    const e3 = i32x4.add(i32x4.add(i32x4.mul(dr3, dr3), i32x4.mul(dg3, dg3)), i32x4.mul(db3, db3));
    const p3 = v128.or(i32x4.shl(e3, 2), pri3V);
    const m = i32x4.min_s(i32x4.min_s(p0, p1), i32x4.min_s(p2, p3));
    const k0 = i32x4.extract_lane(m, 0);
    const k1 = i32x4.extract_lane(m, 1);
    const k2 = i32x4.extract_lane(m, 2);
    const k3 = i32x4.extract_lane(m, 3);
    total += (k0 >> 2) + (k1 >> 2) + (k2 >> 2) + (k3 >> 2);
    if (total >= curErr) return total;
    const a = k0 & 3,
      b = k1 & 3,
      c = k2 & 3,
      d = k3 & 3;
    unchecked((outSels[i] = <u8>(a == 0 ? 3 : a - 1)));
    unchecked((outSels[i + 1] = <u8>(b == 0 ? 3 : b - 1)));
    unchecked((outSels[i + 2] = <u8>(c == 0 ? 3 : c - 1)));
    unchecked((outSels[i + 3] = <u8>(d == 0 ? 3 : d - 1)));
  }
  return total;
}

function findSels3Fullerr(
  useBlack: bool,
  outSels: StaticArray<u8>,
  lr: i32,
  lg: i32,
  lb: i32,
  hr: i32,
  hg: i32,
  hb: i32,
  curErr: i32,
): i32 {
  getBlockColors3(lr, lg, lb, hr, hg, hb);
  const c0R = i32x4.splat(unchecked(blockR3[0]));
  const c0G = i32x4.splat(unchecked(blockG3[0]));
  const c0B = i32x4.splat(unchecked(blockB3[0]));
  const c1R = i32x4.splat(unchecked(blockR3[1]));
  const c1G = i32x4.splat(unchecked(blockG3[1]));
  const c1B = i32x4.splat(unchecked(blockB3[1]));
  const c2R = i32x4.splat(unchecked(blockR3[2]));
  const c2G = i32x4.splat(unchecked(blockG3[2]));
  const c2B = i32x4.splat(unchecked(blockB3[2]));
  const pri0V = i32x4.splat(0);
  const pri1V = i32x4.splat(1);
  const pri2V = i32x4.splat(2);
  const pri3V = i32x4.splat(3);
  const disqualify3 = useBlack ? i32x4.splat(0) : i32x4.splat(0x7fffffff);
  const tm = g_transparentMask;
  let total = 0;
  for (let i = 0; i < 16; i += 4) {
    const off = <usize>(i << 2);
    const rV = v128.load(changetype<usize>(pxR) + off);
    const gV = v128.load(changetype<usize>(pxG) + off);
    const bV = v128.load(changetype<usize>(pxB) + off);
    const dr0 = i32x4.sub(c0R, rV);
    const dg0 = i32x4.sub(c0G, gV);
    const db0 = i32x4.sub(c0B, bV);
    const e0 = i32x4.add(i32x4.add(i32x4.mul(dr0, dr0), i32x4.mul(dg0, dg0)), i32x4.mul(db0, db0));
    const p0 = v128.or(i32x4.shl(e0, 2), pri0V);
    const dr1 = i32x4.sub(c1R, rV);
    const dg1 = i32x4.sub(c1G, gV);
    const db1 = i32x4.sub(c1B, bV);
    const e1 = i32x4.add(i32x4.add(i32x4.mul(dr1, dr1), i32x4.mul(dg1, dg1)), i32x4.mul(db1, db1));
    const p1 = v128.or(i32x4.shl(e1, 2), pri1V);
    const dr2 = i32x4.sub(c2R, rV);
    const dg2 = i32x4.sub(c2G, gV);
    const db2 = i32x4.sub(c2B, bV);
    const e2 = i32x4.add(i32x4.add(i32x4.mul(dr2, dr2), i32x4.mul(dg2, dg2)), i32x4.mul(db2, db2));
    const p2 = v128.or(i32x4.shl(e2, 2), pri2V);
    const e3 = i32x4.add(i32x4.add(i32x4.mul(rV, rV), i32x4.mul(gV, gV)), i32x4.mul(bV, bV));
    const p3 = v128.or(v128.or(i32x4.shl(e3, 2), pri3V), disqualify3);
    const m = i32x4.min_s(i32x4.min_s(p0, p1), i32x4.min_s(p2, p3));
    const k0 = i32x4.extract_lane(m, 0);
    const k1 = i32x4.extract_lane(m, 1);
    const k2 = i32x4.extract_lane(m, 2);
    const k3 = i32x4.extract_lane(m, 3);
    const tBits = (tm >> i) & 0xf;
    const t0 = tBits & 1;
    const t1 = (tBits >> 1) & 1;
    const t2 = (tBits >> 2) & 1;
    const t3 = (tBits >> 3) & 1;
    total += (t0 ? 0 : k0 >> 2) + (t1 ? 0 : k1 >> 2) + (t2 ? 0 : k2 >> 2) + (t3 ? 0 : k3 >> 2);
    if (total >= curErr) return total;
    unchecked((outSels[i] = <u8>(t0 ? 3 : k0 & 3)));
    unchecked((outSels[i + 1] = <u8>(t1 ? 3 : k1 & 3)));
    unchecked((outSels[i + 2] = <u8>(t2 ? 3 : k2 & 3)));
    unchecked((outSels[i + 3] = <u8>(t3 ? 3 : k3 & 3)));
  }
  return total;
}

function computeLsEndpoints4FromSels(
  selsIn: StaticArray<u8>,
  totalR: i32,
  totalG: i32,
  totalB: i32,
): bool {
  let uq00r = 0,
    uq00g = 0,
    uq00b = 0;
  let weightAccum = 0;
  for (let i = 0; i < 16; i++) {
    const r = unchecked(pxR[i]);
    const g = unchecked(pxG[i]);
    const b = unchecked(pxB[i]);
    const sel = <i32>unchecked(selsIn[i]);
    weightAccum += unchecked(WEIGHT_VALS4[sel]);
    uq00r += sel * r;
    uq00g += sel * g;
    uq00b += sel * b;
  }
  const q10r = totalR * 3 - uq00r;
  const q10g = totalG * 3 - uq00g;
  const q10b = totalB * 3 - uq00b;
  const z00 = <f32>((weightAccum >> 16) & 0xff);
  const z10 = <f32>((weightAccum >> 8) & 0xff);
  const z11 = <f32>(weightAccum & 0xff);
  let det = z00 * z11 - z10 * z10;
  if (Mathf.abs(det) < <f32>1e-8) return false;
  det = 3.0 / 255.0 / det;
  const iz00 = z11 * det;
  const iz01 = -z10 * det;
  const iz10 = -z10 * det;
  const iz11 = z00 * det;
  xlR = iz00 * <f32>uq00r + iz01 * <f32>q10r;
  xhR = iz10 * <f32>uq00r + iz11 * <f32>q10r;
  xlG = iz00 * <f32>uq00g + iz01 * <f32>q10g;
  xhG = iz10 * <f32>uq00g + iz11 * <f32>q10g;
  xlB = iz00 * <f32>uq00b + iz01 * <f32>q10b;
  xhB = iz10 * <f32>uq00b + iz11 * <f32>q10b;
  return true;
}

function computeLsEndpoints3FromSels(useBlack: bool, selsIn: StaticArray<u8>): bool {
  let uq00r = 0,
    uq00g = 0,
    uq00b = 0;
  let weightAccum = 0;
  let totalR = 0,
    totalG = 0,
    totalB = 0;
  for (let i = 0; i < 16; i++) {
    const r = unchecked(pxR[i]);
    const g = unchecked(pxG[i]);
    const b = unchecked(pxB[i]);
    if (useBlack && (r | g | b) < 4) continue;
    const sel = <i32>unchecked(selsIn[i]);
    if (sel == 3) continue;
    weightAccum += unchecked(WEIGHT_VALS3[sel]);
    const tsel = sel == 0 ? 0 : sel == 1 ? 2 : 1;
    uq00r += tsel * r;
    uq00g += tsel * g;
    uq00b += tsel * b;
    totalR += r;
    totalG += g;
    totalB += b;
  }
  const q10r = totalR * 2 - uq00r;
  const q10g = totalG * 2 - uq00g;
  const q10b = totalB * 2 - uq00b;
  const z00 = <f32>((weightAccum >> 16) & 0xff);
  const z10 = <f32>((weightAccum >> 8) & 0xff);
  const z11 = <f32>(weightAccum & 0xff);
  let det = z00 * z11 - z10 * z10;
  if (Mathf.abs(det) < <f32>1e-8) return false;
  det = 2.0 / 255.0 / det;
  const iz00 = z11 * det;
  const iz01 = -z10 * det;
  const iz10 = -z10 * det;
  const iz11 = z00 * det;
  xlR = iz00 * <f32>uq00r + iz01 * <f32>q10r;
  xhR = iz10 * <f32>uq00r + iz11 * <f32>q10r;
  xlG = iz00 * <f32>uq00g + iz01 * <f32>q10g;
  xhG = iz10 * <f32>uq00g + iz11 * <f32>q10g;
  xlB = iz00 * <f32>uq00b + iz01 * <f32>q10b;
  xhB = iz10 * <f32>uq00b + iz11 * <f32>q10b;
  return true;
}

function computeLsEndpoints4FromSums(totalR: i32, totalG: i32, totalB: i32, s: i32): void {
  const iz00 = unchecked(selectorFactors4[s * 3]);
  const iz10 = unchecked(selectorFactors4[s * 3 + 1]);
  const iz11 = unchecked(selectorFactors4[s * 3 + 2]);
  const iz01 = iz10;
  const f1 = <i32>unchecked(UNIQUE_ORDERS4[s * 4]);
  const f2 = f1 + <i32>unchecked(UNIQUE_ORDERS4[s * 4 + 1]);
  const f3 = f2 + <i32>unchecked(UNIQUE_ORDERS4[s * 4 + 2]);
  const uq00r =
    unchecked(rSum[f2]) -
    unchecked(rSum[f1]) +
    (unchecked(rSum[f3]) - unchecked(rSum[f2])) * 2 +
    (unchecked(rSum[16]) - unchecked(rSum[f3])) * 3;
  const uq00g =
    unchecked(gSum[f2]) -
    unchecked(gSum[f1]) +
    (unchecked(gSum[f3]) - unchecked(gSum[f2])) * 2 +
    (unchecked(gSum[16]) - unchecked(gSum[f3])) * 3;
  const uq00b =
    unchecked(bSum[f2]) -
    unchecked(bSum[f1]) +
    (unchecked(bSum[f3]) - unchecked(bSum[f2])) * 2 +
    (unchecked(bSum[16]) - unchecked(bSum[f3])) * 3;
  const q10r = <f32>(totalR * 3 - uq00r);
  const q10g = <f32>(totalG * 3 - uq00g);
  const q10b = <f32>(totalB * 3 - uq00b);
  xlR = iz00 * <f32>uq00r + iz01 * q10r;
  xhR = iz10 * <f32>uq00r + iz11 * q10r;
  xlG = iz00 * <f32>uq00g + iz01 * q10g;
  xhG = iz10 * <f32>uq00g + iz11 * q10g;
  xlB = iz00 * <f32>uq00b + iz01 * q10b;
  xhB = iz10 * <f32>uq00b + iz11 * q10b;
}

function computeLsEndpoints3FromSums(totalR: i32, totalG: i32, totalB: i32, s: i32): void {
  const iz00 = unchecked(selectorFactors3[s * 3]);
  const iz10 = unchecked(selectorFactors3[s * 3 + 1]);
  const iz11 = unchecked(selectorFactors3[s * 3 + 2]);
  const iz01 = iz10;
  const f1 = <i32>unchecked(UNIQUE_ORDERS3[s * 3]);
  const f2 = f1 + <i32>unchecked(UNIQUE_ORDERS3[s * 3 + 2]);
  const uq00r =
    (unchecked(rSum[16]) - unchecked(rSum[f2])) * 2 + (unchecked(rSum[f2]) - unchecked(rSum[f1]));
  const uq00g =
    (unchecked(gSum[16]) - unchecked(gSum[f2])) * 2 + (unchecked(gSum[f2]) - unchecked(gSum[f1]));
  const uq00b =
    (unchecked(bSum[16]) - unchecked(bSum[f2])) * 2 + (unchecked(bSum[f2]) - unchecked(bSum[f1]));
  const q10r = <f32>(totalR * 2 - uq00r);
  const q10g = <f32>(totalG * 2 - uq00g);
  const q10b = <f32>(totalB * 2 - uq00b);
  xlR = iz00 * <f32>uq00r + iz01 * q10r;
  xhR = iz10 * <f32>uq00r + iz11 * q10r;
  xlG = iz00 * <f32>uq00g + iz01 * q10g;
  xhG = iz10 * <f32>uq00g + iz11 * q10g;
  xlB = iz00 * <f32>uq00b + iz01 * q10b;
  xhB = iz10 * <f32>uq00b + iz11 * q10b;
}

function preciseRound565(): void {
  let lr = <i32>(xlR * <f32>31.0);
  let lg = <i32>(xlG * <f32>63.0);
  let lb = <i32>(xlB * <f32>31.0);
  let hr = <i32>(xhR * <f32>31.0);
  let hg = <i32>(xhG * <f32>63.0);
  let hb = <i32>(xhB * <f32>31.0);
  lr = clamp31(lr);
  hr = clamp31(hr);
  lb = clamp31(lb);
  hb = clamp31(hb);
  lg = clamp63(lg);
  hg = clamp63(hg);
  lr = (lr + i32(xlR > unchecked(midpoint5[lr]))) & 31;
  lg = (lg + i32(xlG > unchecked(midpoint6[lg]))) & 63;
  lb = (lb + i32(xlB > unchecked(midpoint5[lb]))) & 31;
  hr = (hr + i32(xhR > unchecked(midpoint5[hr]))) & 31;
  hg = (hg + i32(xhG > unchecked(midpoint6[hg]))) & 63;
  hb = (hb + i32(xhB > unchecked(midpoint5[hb]))) & 31;
  prRoundHr = lr;
  prRoundHg = lg;
  prRoundHb = lb;
  prRoundLr = hr;
  prRoundLg = hg;
  prRoundLb = hb;
}

@inline function packUnscaled565(r: i32, g: i32, b: i32): i32 {
  return ((r << 11) | (g << 5) | b) & 0xffff;
}

function emitSolidBlock(outPtr: usize, fr: i32, fg: i32, fb: i32, allow3: bool): void {
  let mask: i32 = 0xaa;
  let max16: i32 = -1;
  let min16: i32 = 0;
  if (allow3) {
    const err4 =
      <i32>unchecked(match5eqE[fr]) + <i32>unchecked(match6eqE[fg]) + <i32>unchecked(match5eqE[fb]);
    const err3 =
      <i32>unchecked(match5halfE[fr]) +
      <i32>unchecked(match6halfE[fg]) +
      <i32>unchecked(match5halfE[fb]);
    if (err3 < err4) {
      max16 =
        ((<i32>unchecked(match5halfHi[fr])) << 11) |
        ((<i32>unchecked(match6halfHi[fg])) << 5) |
        (<i32>unchecked(match5halfHi[fb]));
      min16 =
        ((<i32>unchecked(match5halfLo[fr])) << 11) |
        ((<i32>unchecked(match6halfLo[fg])) << 5) |
        (<i32>unchecked(match5halfLo[fb]));
      if (max16 > min16) {
        const t = max16;
        max16 = min16;
        min16 = t;
      }
    }
  }
  if (max16 == -1) {
    max16 =
      ((<i32>unchecked(match5eqHi[fr])) << 11) |
      ((<i32>unchecked(match6eqHi[fg])) << 5) |
      (<i32>unchecked(match5eqHi[fb]));
    min16 =
      ((<i32>unchecked(match5eqLo[fr])) << 11) |
      ((<i32>unchecked(match6eqLo[fg])) << 5) |
      (<i32>unchecked(match5eqLo[fb]));
    if (min16 == max16) {
      mask = 0;
      if (min16 > 0) min16--;
      else {
        max16 = 1;
        min16 = 0;
        mask = 0x55;
      }
    }
    if (max16 < min16) {
      const t = max16;
      max16 = min16;
      min16 = t;
      mask ^= 0x55;
    }
  }
  store<u16>(outPtr, <u16>max16);
  store<u16>(outPtr + 2, <u16>min16);
  store<u8>(outPtr + 4, <u8>mask);
  store<u8>(outPtr + 5, <u8>mask);
  store<u8>(outPtr + 6, <u8>mask);
  store<u8>(outPtr + 7, <u8>mask);
}

function emit4Color(
  outPtr: usize,
  lr: i32,
  lg: i32,
  lb: i32,
  hr: i32,
  hg: i32,
  hb: i32,
  selsIn: StaticArray<u8>,
): void {
  let lc = packUnscaled565(lr, lg, lb);
  let hc = packUnscaled565(hr, hg, hb);
  if (lc == hc) {
    let mask: i32 = 0;
    if (hc > 0) hc--;
    else {
      hc = 0;
      lc = 1;
      mask = 0x55;
    }
    store<u16>(outPtr, <u16>lc);
    store<u16>(outPtr + 2, <u16>hc);
    store<u8>(outPtr + 4, <u8>mask);
    store<u8>(outPtr + 5, <u8>mask);
    store<u8>(outPtr + 6, <u8>mask);
    store<u8>(outPtr + 7, <u8>mask);
    return;
  }
  let invertMask: i32 = 0;
  if (lc < hc) {
    const t = lc;
    lc = hc;
    hc = t;
    invertMask = 0x55;
  }
  store<u16>(outPtr, <u16>lc);
  store<u16>(outPtr + 2, <u16>hc);
  let packed: u32 = 0;
  for (let i = 0; i < 16; i++) {
    const s = <i32>unchecked(selsIn[i]);
    const trans = s == 0 ? 0 : s == 1 ? 2 : s == 2 ? 3 : 1;
    packed |= (<u32>trans) << (<u32>(i * 2));
  }
  store<u8>(outPtr + 4, <u8>((<i32>(packed & 0xff)) ^ invertMask));
  store<u8>(outPtr + 5, <u8>((<i32>((packed >> 8) & 0xff)) ^ invertMask));
  store<u8>(outPtr + 6, <u8>((<i32>((packed >> 16) & 0xff)) ^ invertMask));
  store<u8>(outPtr + 7, <u8>((<i32>((packed >> 24) & 0xff)) ^ invertMask));
}

function emit3Color(
  outPtr: usize,
  lr: i32,
  lg: i32,
  lb: i32,
  hr: i32,
  hg: i32,
  hb: i32,
  selsIn: StaticArray<u8>,
): void {
  let lc = packUnscaled565(lr, lg, lb);
  let hc = packUnscaled565(hr, hg, hb);
  let invert = false;
  if (lc > hc) {
    const t = lc;
    lc = hc;
    hc = t;
    invert = true;
  }
  store<u16>(outPtr, <u16>lc);
  store<u16>(outPtr + 2, <u16>hc);
  let packed: u32 = 0;
  if (invert) {
    for (let i = 0; i < 16; i++) {
      const s = <i32>unchecked(selsIn[i]);
      const t = s == 0 ? 1 : s == 1 ? 0 : s;
      packed |= (<u32>t) << (<u32>(i * 2));
    }
  } else {
    for (let i = 0; i < 16; i++) {
      packed |= (<u32>unchecked(selsIn[i])) << (<u32>(i * 2));
    }
  }
  store<u8>(outPtr + 4, <u8>(packed & 0xff));
  store<u8>(outPtr + 5, <u8>((packed >> 8) & 0xff));
  store<u8>(outPtr + 6, <u8>((packed >> 16) & 0xff));
  store<u8>(outPtr + 7, <u8>((packed >> 24) & 0xff));
}

function sortDots16(): void {
  for (let i = 1; i < 16; i++) {
    const v = unchecked(dotsBuf[i]);
    let j = i - 1;
    while (j >= 0 && unchecked(dotsBuf[j]) > v) {
      unchecked((dotsBuf[j + 1] = unchecked(dotsBuf[j])));
      j--;
    }
    unchecked((dotsBuf[j + 1] = v));
  }
}

function buildSums(
  lr: i32,
  lg: i32,
  lb: i32,
  hr: i32,
  hg: i32,
  hb: i32,
  totalR: i32,
  totalG: i32,
  totalB: i32,
): void {
  const r0 = (lr << 3) | (lr >> 2);
  const g0 = (lg << 2) | (lg >> 4);
  const b0 = (lb << 3) | (lb >> 2);
  const r3 = (hr << 3) | (hr >> 2);
  const g3 = (hg << 2) | (hg >> 4);
  const b3 = (hb << 3) | (hb >> 2);
  const ar = r3 - r0;
  const ag = g3 - g0;
  const ab = b3 - b0;
  for (let i = 0; i < 16; i++) {
    const d =
      0x1000000 + (unchecked(pxR[i]) * ar + unchecked(pxG[i]) * ag + unchecked(pxB[i]) * ab);
    unchecked((dotsBuf[i] = (d << 4) + i));
  }
  sortDots16();
  let r = 0,
    g = 0,
    b = 0;
  for (let i = 0; i < 16; i++) {
    const p = unchecked(dotsBuf[i]) & 15;
    unchecked((rSum[i] = r));
    unchecked((gSum[i] = g));
    unchecked((bSum[i] = b));
    r += unchecked(pxR[p]);
    g += unchecked(pxG[p]);
    b += unchecked(pxB[p]);
  }
  unchecked((rSum[16] = totalR));
  unchecked((gSum[16] = totalG));
  unchecked((bSum[16] = totalB));
}

let pickLr: i32 = 0;
let pickLg: i32 = 0;
let pickLb: i32 = 0;
let pickHr: i32 = 0;
let pickHg: i32 = 0;
let pickHb: i32 = 0;

function pickInitialPCA(
  grayscale: bool,
  minR: i32,
  minG: i32,
  minB: i32,
  maxR: i32,
  maxG: i32,
  maxB: i32,
  avgR: i32,
  avgG: i32,
  avgB: i32,
): void {
  if (grayscale) {
    const fr = unchecked(pxR[0]);
    if (maxR - minR < 2) {
      const v5 = to5(fr);
      const v6 = to6(fr);
      pickLr = v5;
      pickLb = v5;
      pickHr = v5;
      pickHb = v5;
      pickLg = v6;
      pickHg = v6;
    } else {
      pickLr = to5(minR);
      pickLb = to5(minR);
      pickLg = to6(minR);
      pickHr = to5(maxR);
      pickHb = to5(maxR);
      pickHg = to6(maxR);
    }
    return;
  }
  let icov0 = 0,
    icov1 = 0,
    icov2 = 0,
    icov3 = 0,
    icov4 = 0,
    icov5 = 0;
  for (let i = 0; i < 16; i++) {
    const r = unchecked(pxR[i]) - avgR;
    const g = unchecked(pxG[i]) - avgG;
    const b = unchecked(pxB[i]) - avgB;
    icov0 += r * r;
    icov1 += r * g;
    icov2 += r * b;
    icov3 += g * g;
    icov4 += g * b;
    icov5 += b * b;
  }
  let xr = <f32>(maxR - minR);
  let xg = <f32>(maxG - minG);
  let xb = <f32>(maxB - minB);
  if (icov2 < 0) xr = -xr;
  if (icov4 < 0) xg = -xg;
  const c0 = <f32>icov0 * <f32>(1.0 / 255.0);
  const c1 = <f32>icov1 * <f32>(1.0 / 255.0);
  const c2 = <f32>icov2 * <f32>(1.0 / 255.0);
  const c3 = <f32>icov3 * <f32>(1.0 / 255.0);
  const c4 = <f32>icov4 * <f32>(1.0 / 255.0);
  const c5 = <f32>icov5 * <f32>(1.0 / 255.0);
  for (let p = 0; p < 6; p++) {
    const nr = xr * c0 + xg * c1 + xb * c2;
    const ng = xr * c1 + xg * c3 + xb * c4;
    const nb = xr * c2 + xg * c4 + xb * c5;
    xr = nr;
    xg = ng;
    xb = nb;
  }
  let saxisR: i32 = 306,
    saxisG: i32 = 601,
    saxisB: i32 = 117;
  const ax = Mathf.abs(xr);
  const ay = Mathf.abs(xg);
  const az = Mathf.abs(xb);
  const k = ax > ay ? (ax > az ? ax : az) : ay > az ? ay : az;
  if (k >= 2) {
    const m = <f32>2048.0 / k;
    saxisR = <i32>(xr * m);
    saxisG = <i32>(xg * m);
    saxisB = <i32>(xb * m);
  }
  saxisR = saxisR << 4;
  saxisG = saxisG << 4;
  saxisB = saxisB << 4;
  let lowDot: i32 = 0x7fffffff,
    highDot: i32 = -0x80000000;
  let lowI = 0,
    highI = 0;
  for (let i = 0; i < 16; i++) {
    let d = unchecked(pxR[i]) * saxisR + unchecked(pxG[i]) * saxisG + unchecked(pxB[i]) * saxisB;
    d = (d & ~0xf) + i;
    if (d < lowDot) {
      lowDot = d;
      lowI = d & 15;
    }
    if (d > highDot) {
      highDot = d;
      highI = d & 15;
    }
  }
  pickLr = to5(unchecked(pxR[lowI]));
  pickLg = to6(unchecked(pxG[lowI]));
  pickLb = to5(unchecked(pxB[lowI]));
  pickHr = to5(unchecked(pxR[highI]));
  pickHg = to6(unchecked(pxG[highI]));
  pickHb = to5(unchecked(pxB[highI]));
}

function pickInitialBoundingBox(
  minR: i32,
  minG: i32,
  minB: i32,
  maxR: i32,
  maxG: i32,
  maxB: i32,
  avgR: i32,
  avgG: i32,
  avgB: i32,
): void {
  let lR = <f32>minR * <f32>(1.0 / 255.0);
  let lG = <f32>minG * <f32>(1.0 / 255.0);
  let lB = <f32>minB * <f32>(1.0 / 255.0);
  let hR = <f32>maxR * <f32>(1.0 / 255.0);
  let hG = <f32>maxG * <f32>(1.0 / 255.0);
  let hB = <f32>maxB * <f32>(1.0 / 255.0);
  const bias = <f32>(8.0 / 255.0);
  const insetR = (hR - lR - bias) * <f32>(1.0 / 16.0);
  const insetG = (hG - lG - bias) * <f32>(1.0 / 16.0);
  const insetB = (hB - lB - bias) * <f32>(1.0 / 16.0);
  lR = clampf01(lR + insetR);
  lG = clampf01(lG + insetG);
  lB = clampf01(lB + insetB);
  hR = clampf01(hR - insetR);
  hG = clampf01(hG - insetG);
  hB = clampf01(hB - insetB);
  let icovXz = 0,
    icovYz = 0;
  for (let i = 0; i < 16; i++) {
    const r = unchecked(pxR[i]) - avgR;
    const g = unchecked(pxG[i]) - avgG;
    const b = unchecked(pxB[i]) - avgB;
    icovXz += r * b;
    icovYz += g * b;
  }
  if (icovXz < 0) {
    const t = lR;
    lR = hR;
    hR = t;
  }
  if (icovYz < 0) {
    const t = lG;
    lG = hG;
    hG = t;
  }
  xlR = lR;
  xlG = lG;
  xlB = lB;
  xhR = hR;
  xhG = hG;
  xhB = hB;
  preciseRound565();
  pickLr = prRoundHr;
  pickLg = prRoundHg;
  pickLb = prRoundHb;
  pickHr = prRoundLr;
  pickHg = prRoundLg;
  pickHb = prRoundLb;
}

@inline function clampf01(v: f32): f32 {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const ADJ_VOXELS = StaticArray.fromArray<i8>([
  1, 0, 0, 3, 0, 1, 0, 4, 0, 0, 1, 5, -1, 0, 0, 0, 0, -1, 0, 1, 0, 0, -1, 2, 1, 1, 0, 9, 1, 0, 1,
  10, 0, 1, 1, 11, -1, -1, 0, 6, -1, 0, -1, 7, 0, -1, -1, 8, -1, 1, 0, 13, 1, -1, 0, 12, 0, -1, 1,
  15, 0, 1, -1, 14,
]);

function endpointSearch(anyBlackPixels: bool, curErr: i32): i32 {
  let lr = resLr,
    lg = resLg,
    lb = resLb;
  let hr = resHr,
    hg = resHg,
    hb = resHb;
  let prevImprove: i32 = 0;
  let forbiddenDir: i32 = -1;
  for (let i = 0; i < ENDPOINT_SEARCH_ROUNDS; i++) {
    if (forbiddenDir == (i & 31)) continue;
    const idx = (i & 15) * 4;
    const dx = <i32>unchecked(ADJ_VOXELS[idx]);
    const dy = <i32>unchecked(ADJ_VOXELS[idx + 1]);
    const dz = <i32>unchecked(ADJ_VOXELS[idx + 2]);
    let trialLr = lr,
      trialLg = lg,
      trialLb = lb;
    let trialHr = hr,
      trialHg = hg,
      trialHb = hb;
    if ((i >> 4) & 1) {
      trialLr = clampi(trialLr + dx, 0, 31);
      trialLg = clampi(trialLg + dy, 0, 63);
      trialLb = clampi(trialLb + dz, 0, 31);
    } else {
      trialHr = clampi(trialHr + dx, 0, 31);
      trialHg = clampi(trialHg + dy, 0, 63);
      trialHb = clampi(trialHb + dz, 0, 31);
    }
    let trialErr: i32;
    if (res3Color) {
      trialErr = findSels3Fullerr(
        anyBlackPixels,
        trialSels,
        trialLr,
        trialLg,
        trialLb,
        trialHr,
        trialHg,
        trialHb,
        curErr,
      );
    } else {
      trialErr = findSels4Fullerr(
        trialSels,
        trialLr,
        trialLg,
        trialLb,
        trialHr,
        trialHg,
        trialHb,
        curErr,
      );
    }
    if (trialErr < curErr) {
      curErr = trialErr;
      forbiddenDir = (<i32>unchecked(ADJ_VOXELS[idx + 3])) | (i & 16);
      lr = trialLr;
      lg = trialLg;
      lb = trialLb;
      hr = trialHr;
      hg = trialHg;
      hb = trialHb;
      for (let k = 0; k < 16; k++) unchecked((sels[k] = unchecked(trialSels[k])));
      prevImprove = i;
    }
    if (i - prevImprove > 32) break;
  }
  resLr = lr;
  resLg = lg;
  resLb = lb;
  resHr = hr;
  resHg = hg;
  resHb = hb;
  return curErr;
}

function try3ColorBlock(
  curErr: i32,
  avgR: i32,
  avgG: i32,
  avgB: i32,
  origLr: i32,
  origLg: i32,
  origLb: i32,
  origHr: i32,
  origHg: i32,
  origHb: i32,
  totalR: i32,
  totalG: i32,
  totalB: i32,
): i32 {
  let lr = origLr,
    lg = origLg,
    lb = origLb;
  let hr = origHr,
    hg = origHg,
    hb = origHb;
  let trialErr = findSels3Fullerr(false, trialSels, lr, lg, lb, hr, hg, hb, 0x7fffffff);

  if (trialErr != 0) {
    for (let trials = 0; trials < 2; trials++) {
      let lr2: i32, lg2: i32, lb2: i32, hr2: i32, hg2: i32, hb2: i32;
      if (!computeLsEndpoints3FromSels(false, trialSels)) {
        lr2 = <i32>unchecked(match5halfHi[avgR]);
        lg2 = <i32>unchecked(match6halfHi[avgG]);
        lb2 = <i32>unchecked(match5halfHi[avgB]);
        hr2 = <i32>unchecked(match5halfLo[avgR]);
        hg2 = <i32>unchecked(match6halfLo[avgG]);
        hb2 = <i32>unchecked(match5halfLo[avgB]);
      } else {
        preciseRound565();
        hr2 = prRoundHr;
        hg2 = prRoundHg;
        hb2 = prRoundHb;
        lr2 = prRoundLr;
        lg2 = prRoundLg;
        lb2 = prRoundLb;
      }
      if (lr == lr2 && lg == lg2 && lb == lb2 && hr == hr2 && hg == hg2 && hb == hb2) break;
      const trialErr2 = findSels3Fullerr(false, trialSels2, lr2, lg2, lb2, hr2, hg2, hb2, trialErr);
      if (trialErr2 < trialErr) {
        trialErr = trialErr2;
        lr = lr2;
        lg = lg2;
        lb = lb2;
        hr = hr2;
        hg = hg2;
        hb = hb2;
        for (let k = 0; k < 16; k++) unchecked((trialSels[k] = unchecked(trialSels2[k])));
      } else break;
    }
  }

  if (trialErr != 0) {
    let h0 = 0,
      h1 = 0,
      h2 = 0;
    for (let i = 0; i < 16; i++) {
      const s = <i32>unchecked(trialSels[i]);
      if (s == 0) h0++;
      else if (s == 1) h1++;
      else h2++;
    }
    const origIdx = lookupOrder3(h0, h1, h2);
    buildSums(lr, lg, lb, hr, hg, hb, totalR, totalG, totalB);
    for (let q = 0; q < TOTAL_ORDERINGS_3; q++) {
      const s = <i32>unchecked(BEST_ORDERINGS3[origIdx * 32 + q]);
      let trialLr: i32, trialLg: i32, trialLb: i32, trialHr: i32, trialHg: i32, trialHb: i32;
      if (s == TOTAL_ORDER_3_0_16 || s == TOTAL_ORDER_3_1_16 || s == TOTAL_ORDER_3_2_16) {
        trialLr = <i32>unchecked(match5halfHi[avgR]);
        trialLg = <i32>unchecked(match6halfHi[avgG]);
        trialLb = <i32>unchecked(match5halfHi[avgB]);
        trialHr = <i32>unchecked(match5halfLo[avgR]);
        trialHg = <i32>unchecked(match6halfLo[avgG]);
        trialHb = <i32>unchecked(match5halfLo[avgB]);
      } else {
        computeLsEndpoints3FromSums(totalR, totalG, totalB, s);
        preciseRound565();
        trialHr = prRoundHr;
        trialHg = prRoundHg;
        trialHb = prRoundHb;
        trialLr = prRoundLr;
        trialLg = prRoundLg;
        trialLb = prRoundLb;
      }
      const trialErr2 = findSels3Fullerr(
        false,
        trialSels2,
        trialLr,
        trialLg,
        trialLb,
        trialHr,
        trialHg,
        trialHb,
        0x7fffffff,
      );
      if (trialErr2 < trialErr) {
        trialErr = trialErr2;
        lr = trialLr;
        lg = trialLg;
        lb = trialLb;
        hr = trialHr;
        hg = trialHg;
        hb = trialHb;
        for (let k = 0; k < 16; k++) unchecked((trialSels[k] = unchecked(trialSels2[k])));
      }
    }
  }

  if (trialErr < curErr) {
    res3Color = true;
    resLr = lr;
    resLg = lg;
    resLb = lb;
    resHr = hr;
    resHg = hg;
    resHb = hb;
    for (let k = 0; k < 16; k++) unchecked((sels[k] = unchecked(trialSels[k])));
    return trialErr;
  }
  return curErr;
}

function encodeBlock(outPtr: usize): void {
  const fr = unchecked(pxR[0]);
  const fg = unchecked(pxG[0]);
  const fb = unchecked(pxB[0]);
  let solid = true;
  for (let i = 1; i < 16; i++) {
    if (unchecked(pxR[i]) != fr || unchecked(pxG[i]) != fg || unchecked(pxB[i]) != fb) {
      solid = false;
      break;
    }
  }
  if (solid) {
    emitSolidBlock(outPtr, fr, fg, fb, true);
    return;
  }

  let totalR = fr,
    totalG = fg,
    totalB = fb;
  let minR = fr,
    minG = fg,
    minB = fb;
  let maxR = fr,
    maxG = fg,
    maxB = fb;
  let grayscale: bool = fr == fg && fr == fb;
  let anyBlack: bool = (fr | fg | fb) < 4;
  for (let i = 1; i < 16; i++) {
    const r = unchecked(pxR[i]);
    const g = unchecked(pxG[i]);
    const b = unchecked(pxB[i]);
    grayscale = grayscale && r == g && r == b;
    anyBlack = anyBlack || (r | g | b) < 4;
    if (r > maxR) maxR = r;
    if (g > maxG) maxG = g;
    if (b > maxB) maxB = b;
    if (r < minR) minR = r;
    if (g < minG) minG = g;
    if (b < minB) minB = b;
    totalR += r;
    totalG += g;
    totalB += b;
  }
  const avgR = (totalR + 8) >> 4;
  const avgG = (totalG + 8) >> 4;
  const avgB = (totalB + 8) >> 4;

  res3Color = false;

  let lr: i32 = 0,
    lg: i32 = 0,
    lb: i32 = 0,
    hr: i32 = 0,
    hg: i32 = 0,
    hb: i32 = 0;
  let origLr: i32 = 0,
    origLg: i32 = 0,
    origLb: i32 = 0,
    origHr: i32 = 0,
    origHg: i32 = 0,
    origHb: i32 = 0;
  let curErr: i32 = 0x7fffffff;

  for (let round = 0; round < 2; round++) {
    if (round == 0) pickInitialPCA(grayscale, minR, minG, minB, maxR, maxG, maxB, avgR, avgG, avgB);
    else pickInitialBoundingBox(minR, minG, minB, maxR, maxG, maxB, avgR, avgG, avgB);
    let roundLr = pickLr,
      roundLg = pickLg,
      roundLb = pickLb;
    let roundHr = pickHr,
      roundHg = pickHg,
      roundHb = pickHb;
    const origRoundLr = roundLr,
      origRoundLg = roundLg,
      origRoundLb = roundLb;
    const origRoundHr = roundHr,
      origRoundHg = roundHg,
      origRoundHb = roundHb;
    let roundErr = findSels4Fullerr(
      roundSels,
      roundLr,
      roundLg,
      roundLb,
      roundHr,
      roundHg,
      roundHb,
      0x7fffffff,
    );
    for (let lp = 0; lp < 2; lp++) {
      let trialLr: i32, trialLg: i32, trialLb: i32, trialHr: i32, trialHg: i32, trialHb: i32;
      if (!computeLsEndpoints4FromSels(roundSels, totalR, totalG, totalB)) {
        trialLr = <i32>unchecked(match5eqHi[avgR]);
        trialLg = <i32>unchecked(match6eqHi[avgG]);
        trialLb = <i32>unchecked(match5eqHi[avgB]);
        trialHr = <i32>unchecked(match5eqLo[avgR]);
        trialHg = <i32>unchecked(match6eqLo[avgG]);
        trialHb = <i32>unchecked(match5eqLo[avgB]);
      } else {
        preciseRound565();
        trialHr = prRoundHr;
        trialHg = prRoundHg;
        trialHb = prRoundHb;
        trialLr = prRoundLr;
        trialLg = prRoundLg;
        trialLb = prRoundLb;
      }
      if (
        roundLr == trialLr &&
        roundLg == trialLg &&
        roundLb == trialLb &&
        roundHr == trialHr &&
        roundHg == trialHg &&
        roundHb == trialHb
      )
        break;
      const trialErr = findSels4Fullerr(
        trialSels,
        trialLr,
        trialLg,
        trialLb,
        trialHr,
        trialHg,
        trialHb,
        roundErr,
      );
      if (trialErr < roundErr) {
        roundLr = trialLr;
        roundLg = trialLg;
        roundLb = trialLb;
        roundHr = trialHr;
        roundHg = trialHg;
        roundHb = trialHb;
        roundErr = trialErr;
        for (let k = 0; k < 16; k++) unchecked((roundSels[k] = unchecked(trialSels[k])));
      } else break;
    }
    if (roundErr <= curErr) {
      curErr = roundErr;
      lr = roundLr;
      lg = roundLg;
      lb = roundLb;
      hr = roundHr;
      hg = roundHg;
      hb = roundHb;
      origLr = origRoundLr;
      origLg = origRoundLg;
      origLb = origRoundLb;
      origHr = origRoundHr;
      origHg = origRoundHg;
      origHb = origRoundHb;
      for (let k = 0; k < 16; k++) unchecked((sels[k] = unchecked(roundSels[k])));
    }
  }

  if (curErr != 0) {
    for (let iter = 0; iter < 2; iter++) {
      const origErr = curErr;
      let h0 = 0,
        h1 = 0,
        h2 = 0,
        h3 = 0;
      for (let i = 0; i < 16; i++) {
        const s = <i32>unchecked(sels[i]);
        if (s == 0) h0++;
        else if (s == 1) h1++;
        else if (s == 2) h2++;
        else h3++;
      }
      const origIdx = lookupOrder4(h0, h1, h2, h3);
      buildSums(lr, lg, lb, hr, hg, hb, totalR, totalG, totalB);
      for (let q = 0; q < TOTAL_ORDERINGS_4; q++) {
        const s = <i32>unchecked(BEST_ORDERINGS4[origIdx * MAX_TOTAL_ORDERINGS4 + q]);
        let trialLr: i32, trialLg: i32, trialLb: i32, trialHr: i32, trialHg: i32, trialHb: i32;
        if (
          s == TOTAL_ORDER_4_0_16 ||
          s == TOTAL_ORDER_4_1_16 ||
          s == TOTAL_ORDER_4_2_16 ||
          s == TOTAL_ORDER_4_3_16
        ) {
          trialLr = <i32>unchecked(match5eqHi[avgR]);
          trialLg = <i32>unchecked(match6eqHi[avgG]);
          trialLb = <i32>unchecked(match5eqHi[avgB]);
          trialHr = <i32>unchecked(match5eqLo[avgR]);
          trialHg = <i32>unchecked(match6eqLo[avgG]);
          trialHb = <i32>unchecked(match5eqLo[avgB]);
        } else {
          computeLsEndpoints4FromSums(totalR, totalG, totalB, s);
          preciseRound565();
          trialHr = prRoundHr;
          trialHg = prRoundHg;
          trialHb = prRoundHb;
          trialLr = prRoundLr;
          trialLg = prRoundLg;
          trialLb = prRoundLb;
        }
        const trialErr = findSels4Fullerr(
          trialSels,
          trialLr,
          trialLg,
          trialLb,
          trialHr,
          trialHg,
          trialHb,
          curErr,
        );
        if (trialErr < curErr) {
          curErr = trialErr;
          lr = trialLr;
          lg = trialLg;
          lb = trialLb;
          hr = trialHr;
          hg = trialHg;
          hb = trialHb;
          for (let k = 0; k < 16; k++) unchecked((sels[k] = unchecked(trialSels[k])));
        }
      }
      if (curErr == 0 || curErr == origErr) break;
    }
  }

  resLr = lr;
  resLg = lg;
  resLb = lb;
  resHr = hr;
  resHg = hg;
  resHb = hb;

  if (curErr != 0) {
    curErr = try3ColorBlock(
      curErr,
      avgR,
      avgG,
      avgB,
      origLr,
      origLg,
      origLb,
      origHr,
      origHg,
      origHb,
      totalR,
      totalG,
      totalB,
    );
  }

  if (curErr != 0) {
    curErr = endpointSearch(false, curErr);
  }

  if (res3Color) {
    emit3Color(outPtr, resLr, resLg, resLb, resHr, resHg, resHb, sels);
  } else {
    emit4Color(outPtr, resLr, resLg, resLb, resHr, resHg, resHb, sels);
  }
}

function emitAllTransparentBlock(outPtr: usize): void {
  store<u16>(outPtr, <u16>0);
  store<u16>(outPtr + 2, <u16>1);
  store<u32>(outPtr + 4, 0xffffffff);
}

function encodeBlockAlphaAware(outPtr: usize): void {
  let minR: i32 = 255,
    minG: i32 = 255,
    minB: i32 = 255;
  let maxR: i32 = 0,
    maxG: i32 = 0,
    maxB: i32 = 0;
  let opaqueCount: i32 = 0;
  for (let i = 0; i < 16; i++) {
    if (((g_transparentMask >> i) & 1) != 0) continue;
    const r = unchecked(pxR[i]);
    const g = unchecked(pxG[i]);
    const b = unchecked(pxB[i]);
    if (r > maxR) maxR = r;
    if (g > maxG) maxG = g;
    if (b > maxB) maxB = b;
    if (r < minR) minR = r;
    if (g < minG) minG = g;
    if (b < minB) minB = b;
    opaqueCount++;
  }
  if (opaqueCount == 0) {
    emitAllTransparentBlock(outPtr);
    return;
  }
  let lr = to5(minR),
    lg = to6(minG),
    lb = to5(minB);
  let hr = to5(maxR),
    hg = to6(maxG),
    hb = to5(maxB);
  let trialErr = findSels3Fullerr(false, trialSels, lr, lg, lb, hr, hg, hb, 0x7fffffff);
  for (let iter = 0; iter < 2; iter++) {
    if (trialErr == 0) break;
    if (!computeLsEndpoints3FromSels(false, trialSels)) break;
    preciseRound565();
    const lr2 = prRoundLr,
      lg2 = prRoundLg,
      lb2 = prRoundLb;
    const hr2 = prRoundHr,
      hg2 = prRoundHg,
      hb2 = prRoundHb;
    if (lr == lr2 && lg == lg2 && lb == lb2 && hr == hr2 && hg == hg2 && hb == hb2) break;
    const trialErr2 = findSels3Fullerr(false, trialSels2, lr2, lg2, lb2, hr2, hg2, hb2, trialErr);
    if (trialErr2 < trialErr) {
      trialErr = trialErr2;
      lr = lr2;
      lg = lg2;
      lb = lb2;
      hr = hr2;
      hg = hg2;
      hb = hb2;
      for (let k = 0; k < 16; k++) unchecked((trialSels[k] = unchecked(trialSels2[k])));
    } else break;
  }
  emit3Color(outPtr, lr, lg, lb, hr, hg, hb, trialSels);
}

export function bc1EncodeRgbcxImpl(linRgbaPtr: usize, outPtr: usize, texW: i32, texH: i32): void {
  ensureInit();
  const blocksX = texW / 4;
  const blocksY = texH / 4;
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let transparentMask: i32 = 0;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const px = bx * 4 + col;
          const py = by * 4 + row;
          const linOff = linRgbaPtr + <usize>((py * texW + px) * 16);
          const k = row * 4 + col;
          const a = load<f32>(linOff + 12);
          if (a < <f32>0.5) {
            transparentMask |= 1 << k;
            unchecked((pxR[k] = 0));
            unchecked((pxG[k] = 0));
            unchecked((pxB[k] = 0));
          } else {
            const r = load<f32>(linOff) * <f32>255.0 + <f32>0.5;
            const g = load<f32>(linOff + 4) * <f32>255.0 + <f32>0.5;
            const b = load<f32>(linOff + 8) * <f32>255.0 + <f32>0.5;
            const ri = <i32>r;
            const gi = <i32>g;
            const bi = <i32>b;
            unchecked((pxR[k] = ri < 0 ? 0 : ri > 255 ? 255 : ri));
            unchecked((pxG[k] = gi < 0 ? 0 : gi > 255 ? 255 : gi));
            unchecked((pxB[k] = bi < 0 ? 0 : bi > 255 ? 255 : bi));
          }
        }
      }
      const blockOut = outPtr + <usize>((by * blocksX + bx) * 8);
      g_transparentMask = transparentMask;
      if (transparentMask == 0) {
        encodeBlock(blockOut);
      } else {
        encodeBlockAlphaAware(blockOut);
      }
    }
  }
}
