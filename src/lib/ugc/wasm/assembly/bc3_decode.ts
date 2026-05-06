const BC3_ROW_SWIZZLE_LUT = new StaticArray<u8>(256 * 16);
const BC3_ALPHA_ROW_LUT = new StaticArray<u8>(4096 * 16);

for (let b = 0; b < 256; b++) {
  const off = b * 16;
  for (let p = 0; p < 4; p++) {
    const idx = (b >> (2 * p)) & 3;
    const palOff = idx * 4;
    BC3_ROW_SWIZZLE_LUT[off + p * 4] = <u8>palOff;
    BC3_ROW_SWIZZLE_LUT[off + p * 4 + 1] = <u8>(palOff + 1);
    BC3_ROW_SWIZZLE_LUT[off + p * 4 + 2] = <u8>(palOff + 2);
    BC3_ROW_SWIZZLE_LUT[off + p * 4 + 3] = <u8>(palOff + 3);
  }
}

for (let v = 0; v < 4096; v++) {
  const base = v * 16;
  for (let k = 0; k < 16; k++) BC3_ALPHA_ROW_LUT[base + k] = 0xff;
  BC3_ALPHA_ROW_LUT[base + 3] = <u8>(v & 0x7);
  BC3_ALPHA_ROW_LUT[base + 7] = <u8>((v >> 3) & 0x7);
  BC3_ALPHA_ROW_LUT[base + 11] = <u8>((v >> 6) & 0x7);
  BC3_ALPHA_ROW_LUT[base + 15] = <u8>((v >> 9) & 0x7);
}

@inline
function rgb565R(c: i32): i32 {
  return (((c >> 11) & 0x1f) * 255) / 31;
}

@inline
function rgb565G(c: i32): i32 {
  return (((c >> 5) & 0x3f) * 255) / 63;
}

@inline
function rgb565B(c: i32): i32 {
  return ((c & 0x1f) * 255) / 31;
}

@inline
function buildAlphaPalLow(a0: i32, a1: i32): u64 {
  let aLo: u64 = (<u64>a0) | ((<u64>a1) << 8);
  if (a0 > a1) {
    aLo |= (<u64>((6 * a0 + a1) / 7)) << 16;
    aLo |= (<u64>((5 * a0 + 2 * a1) / 7)) << 24;
    aLo |= (<u64>((4 * a0 + 3 * a1) / 7)) << 32;
    aLo |= (<u64>((3 * a0 + 4 * a1) / 7)) << 40;
    aLo |= (<u64>((2 * a0 + 5 * a1) / 7)) << 48;
    aLo |= (<u64>((a0 + 6 * a1) / 7)) << 56;
  } else {
    aLo |= (<u64>((4 * a0 + a1) / 5)) << 16;
    aLo |= (<u64>((3 * a0 + 2 * a1) / 5)) << 24;
    aLo |= (<u64>((2 * a0 + 3 * a1) / 5)) << 32;
    aLo |= (<u64>((a0 + 4 * a1) / 5)) << 40;
    aLo |= (<u64>255) << 56;
  }
  return aLo;
}

@inline
function bc3ComputeP23(v16_p01: v128, v16_swapped: v128): v128 {
  const splat21846 = i16x8.splat(21846);
  const vSum = i16x8.add(i16x8.shl(v16_p01, 1), v16_swapped);
  const v32_lo = v128.extmul_low<u16>(vSum, splat21846);
  const v32_hi = v128.extmul_high<u16>(vSum, splat21846);
  return v128.narrow<u32>(v128.shr<u32>(v32_lo, 16), v128.shr<u32>(v32_hi, 16));
}

@inline
function bc3StoreBlock(
  palVec: v128,
  aPalVec: v128,
  colorIndices: u32,
  alphaIdxBits: u64,
  baseDst: usize,
  stride: usize,
  lutBase: usize,
  alphaLutBase: usize,
): void {
  const ci0 = <i32>(colorIndices & 0xff);
  const ci1 = <i32>((colorIndices >> 8) & 0xff);
  const ci2 = <i32>((colorIndices >> 16) & 0xff);
  const ci3 = <i32>((colorIndices >> 24) & 0xff);

  const sv0 = v128.load(lutBase + ((<usize>ci0) << 4));
  const sv1 = v128.load(lutBase + ((<usize>ci1) << 4));
  const sv2 = v128.load(lutBase + ((<usize>ci2) << 4));
  const sv3 = v128.load(lutBase + ((<usize>ci3) << 4));

  const ai0 = <usize>(alphaIdxBits & 0xfff);
  const ai1 = <usize>((alphaIdxBits >> 12) & 0xfff);
  const ai2 = <usize>((alphaIdxBits >> 24) & 0xfff);
  const ai3 = <usize>((alphaIdxBits >> 36) & 0xfff);

  const av0 = v128.load(alphaLutBase + (ai0 << 4));
  const av1 = v128.load(alphaLutBase + (ai1 << 4));
  const av2 = v128.load(alphaLutBase + (ai2 << 4));
  const av3 = v128.load(alphaLutBase + (ai3 << 4));

  v128.store(baseDst, v128.or(v128.swizzle(palVec, sv0), v128.swizzle(aPalVec, av0)));
  v128.store(baseDst + stride, v128.or(v128.swizzle(palVec, sv1), v128.swizzle(aPalVec, av1)));
  v128.store(baseDst + stride * 2, v128.or(v128.swizzle(palVec, sv2), v128.swizzle(aPalVec, av2)));
  v128.store(baseDst + stride * 3, v128.or(v128.swizzle(palVec, sv3), v128.swizzle(aPalVec, av3)));
}

export function bc3DecodeImpl(blocksPtr: usize, dstPtr: usize, texW: i32, texH: i32): void {
  const blocksX = texW / 4;
  const blocksY = texH / 4;
  const lutBase = changetype<usize>(BC3_ROW_SWIZZLE_LUT);
  const alphaLutBase = changetype<usize>(BC3_ALPHA_ROW_LUT);
  const stride = <usize>(texW * 4);

  const splatDiv31 = i16x8(-31710, -31710, -31710, -31710, -31710, -31710, -31710, -31710);
  const splatDiv63 = i16x8(16645, 16645, 16645, 16645, 16645, 16645, 16645, 16645);
  const splat255 = i16x8.splat(255);
  const mask5 = i16x8.splat(0x1f);
  const mask6 = i16x8.splat(0x3f);

  for (let by = 0; by < blocksY; by++) {
    let bx = 0;
    for (; bx + 1 < blocksX; bx += 2) {
      const offA = blocksPtr + <usize>((by * blocksX + bx) * 16);

      const blockHeadA = load<u64>(offA);
      const blockHeadB = load<u64>(offA + 16);
      const a0a = <i32>(blockHeadA & 0xff);
      const a1a = <i32>((blockHeadA >> 8) & 0xff);
      const alphaIdxBitsA = blockHeadA >> 16;
      const a0b = <i32>(blockHeadB & 0xff);
      const a1b = <i32>((blockHeadB >> 8) & 0xff);
      const alphaIdxBitsB = blockHeadB >> 16;

      const aPalVecA = i64x2.splat(buildAlphaPalLow(a0a, a1a));
      const aPalVecB = i64x2.splat(buildAlphaPalLow(a0b, a1b));

      const indicesA = load<u32>(offA + 12);
      const indicesB = load<u32>(offA + 28);

      const v_blockA = v128.load(offA);
      const v_blockB = v128.load(offA + 16);
      const v_c = v128.shuffle<u8>(
        v_blockA,
        v_blockB,
        8,
        9,
        10,
        11,
        24,
        25,
        26,
        27,
        16,
        16,
        16,
        16,
        16,
        16,
        16,
        16,
      );

      const v_r5 = v128.and(v128.shr<u16>(v_c, 11), mask5);
      const v_g6 = v128.and(v128.shr<u16>(v_c, 5), mask6);
      const v_b5 = v128.and(v_c, mask5);

      const v_rb5 = v128.shuffle<i16>(v_r5, v_b5, 0, 1, 2, 3, 8, 9, 10, 11);
      const v_rb_x255 = i16x8.mul(v_rb5, splat255);
      const v_g_x255 = i16x8.mul(v_g6, splat255);

      const v_rb_lo = v128.extmul_low<u16>(v_rb_x255, splatDiv31);
      const v_rb_hi = v128.extmul_high<u16>(v_rb_x255, splatDiv31);
      const v_rb_div = v128.narrow<u32>(v128.shr<u32>(v_rb_lo, 20), v128.shr<u32>(v_rb_hi, 20));

      const v_g_lo = v128.extmul_low<u16>(v_g_x255, splatDiv63);
      const v_g_div = v128.narrow<u32>(v128.shr<u32>(v_g_lo, 20), v128.shr<u32>(v_g_lo, 20));

      const palVecAB = v128.shuffle<u8>(
        v_rb_div,
        v_g_div,
        0,
        16,
        8,
        1,
        2,
        18,
        10,
        1,
        4,
        20,
        12,
        1,
        6,
        22,
        14,
        1,
      );

      const v16_p01a = v128.extend_low<u8>(palVecAB);
      const v16_p01b = v128.extend_high<u8>(palVecAB);
      const v16_swappedA = v128.shuffle<i16>(v16_p01a, v16_p01a, 4, 5, 6, 7, 0, 1, 2, 3);
      const v16_swappedB = v128.shuffle<i16>(v16_p01b, v16_p01b, 4, 5, 6, 7, 0, 1, 2, 3);

      const v16_p23a = bc3ComputeP23(v16_p01a, v16_swappedA);
      const v16_p23b = bc3ComputeP23(v16_p01b, v16_swappedB);

      const palVecA = v128.narrow<u16>(v16_p01a, v16_p23a);
      const palVecB = v128.narrow<u16>(v16_p01b, v16_p23b);

      const baseDstA = dstPtr + <usize>((by * 4 * texW + bx * 4) * 4);
      bc3StoreBlock(
        palVecA,
        aPalVecA,
        indicesA,
        alphaIdxBitsA,
        baseDstA,
        stride,
        lutBase,
        alphaLutBase,
      );
      bc3StoreBlock(
        palVecB,
        aPalVecB,
        indicesB,
        alphaIdxBitsB,
        baseDstA + 16,
        stride,
        lutBase,
        alphaLutBase,
      );
    }

    for (; bx < blocksX; bx++) {
      const off = blocksPtr + <usize>((by * blocksX + bx) * 16);
      const blockHead = load<u64>(off);
      const a0 = <i32>(blockHead & 0xff);
      const a1 = <i32>((blockHead >> 8) & 0xff);
      const alphaIdxBits = blockHead >> 16;

      const aPalVec = i64x2.splat(buildAlphaPalLow(a0, a1));

      const c0 = <i32>load<u16>(off + 8);
      const c1 = <i32>load<u16>(off + 10);
      const colorIndices = load<u32>(off + 12);
      const r0 = rgb565R(c0);
      const g0 = rgb565G(c0);
      const b0 = rgb565B(c0);
      const r1 = rgb565R(c1);
      const g1 = rgb565G(c1);
      const b1 = rgb565B(c1);
      const pr2 = (2 * r0 + r1) / 3;
      const pg2 = (2 * g0 + g1) / 3;
      const pb2 = (2 * b0 + b1) / 3;
      const pr3 = (r0 + 2 * r1) / 3;
      const pg3 = (g0 + 2 * g1) / 3;
      const pb3 = (b0 + 2 * b1) / 3;
      const p0 = r0 | (g0 << 8) | (b0 << 16);
      const p1 = r1 | (g1 << 8) | (b1 << 16);
      const p2 = pr2 | (pg2 << 8) | (pb2 << 16);
      const p3 = pr3 | (pg3 << 8) | (pb3 << 16);
      const palVec = i32x4(p0, p1, p2, p3);

      const baseDst = dstPtr + <usize>((by * 4 * texW + bx * 4) * 4);
      bc3StoreBlock(
        palVec,
        aPalVec,
        colorIndices,
        alphaIdxBits,
        baseDst,
        stride,
        lutBase,
        alphaLutBase,
      );
    }
  }
}
