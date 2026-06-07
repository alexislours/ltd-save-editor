const BC1_ROW_SWIZZLE_LUT = new StaticArray<u8>(256 * 16);

for (let b = 0; b < 256; b++) {
  const off = b * 16;
  for (let p = 0; p < 4; p++) {
    const idx = (b >> (2 * p)) & 3;
    const palOff = idx * 4;
    BC1_ROW_SWIZZLE_LUT[off + p * 4] = <u8>palOff;
    BC1_ROW_SWIZZLE_LUT[off + p * 4 + 1] = <u8>(palOff + 1);
    BC1_ROW_SWIZZLE_LUT[off + p * 4 + 2] = <u8>(palOff + 2);
    BC1_ROW_SWIZZLE_LUT[off + p * 4 + 3] = <u8>(palOff + 3);
  }
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
function bc1ComputeP23(v16_p01: v128, v16_swapped: v128, fourColor: bool): v128 {
  if (fourColor) {
    const vSum = i16x8.add(i16x8.shl(v16_p01, 1), v16_swapped);
    const v32_lo = v128.extmul_low<u16>(vSum, i16x8.splat(21846));
    const v32_hi = v128.extmul_high<u16>(vSum, i16x8.splat(21846));
    return v128.narrow<u32>(v128.shr<u32>(v32_lo, 16), v128.shr<u32>(v32_hi, 16));
  }
  const vSum = i16x8.add(v16_p01, v16_swapped);
  const vDiv = v128.shr<u16>(vSum, 1);
  return v128.and(vDiv, i16x8(-1, -1, -1, -1, 0, 0, 0, 0));
}

@inline
function bc1StoreBlock(
  palVec: v128,
  indices: u32,
  baseDst: usize,
  stride: usize,
  lutBase: usize,
): void {
  const sv0 = v128.load(lutBase + ((<usize>(indices & 0xff)) << 4));
  const sv1 = v128.load(lutBase + ((<usize>((indices >> 8) & 0xff)) << 4));
  const sv2 = v128.load(lutBase + ((<usize>((indices >> 16) & 0xff)) << 4));
  const sv3 = v128.load(lutBase + ((<usize>((indices >> 24) & 0xff)) << 4));
  v128.store(baseDst, v128.swizzle(palVec, sv0));
  v128.store(baseDst + stride, v128.swizzle(palVec, sv1));
  v128.store(baseDst + stride * 2, v128.swizzle(palVec, sv2));
  v128.store(baseDst + stride * 3, v128.swizzle(palVec, sv3));
}

export function bc1DecodeImpl(blocksPtr: usize, dstPtr: usize, texW: i32, texH: i32): void {
  const blocksX = texW / 4;
  const blocksY = texH / 4;
  const lutBase = changetype<usize>(BC1_ROW_SWIZZLE_LUT);
  const stride = <usize>(texW * 4);
  const ALPHA: i32 = 0xff << 24;

  const splatDiv31 = i16x8(-31710, -31710, -31710, -31710, -31710, -31710, -31710, -31710);
  const splatDiv63 = i16x8(16645, 16645, 16645, 16645, 16645, 16645, 16645, 16645);
  const splat255 = i16x8.splat(255);
  const mask5 = i16x8.splat(0x1f);
  const mask6 = i16x8.splat(0x3f);
  const alphaPattern = i32x4.splat(<i32>ALPHA);

  for (let by = 0; by < blocksY; by++) {
    let bx = 0;
    for (; bx + 1 < blocksX; bx += 2) {
      const offA = blocksPtr + <usize>((by * blocksX + bx) * 8);
      const indicesA = load<u32>(offA + 4);
      const indicesB = load<u32>(offA + 12);
      const c0a = <i32>load<u16>(offA);
      const c1a = <i32>load<u16>(offA + 2);
      const c0b = <i32>load<u16>(offA + 8);
      const c1b = <i32>load<u16>(offA + 10);

      const v_block = v128.load(offA);
      const v_c = v128.shuffle<u8>(
        v_block,
        v_block,
        0,
        1,
        2,
        3,
        8,
        9,
        10,
        11,
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

      const palVecAB_raw = v128.shuffle<u8>(
        v_rb_div,
        v_g_div,
        0,
        16,
        8,
        0,
        2,
        18,
        10,
        0,
        4,
        20,
        12,
        0,
        6,
        22,
        14,
        0,
      );
      const palVecAB = v128.or(palVecAB_raw, alphaPattern);

      const v16_p01a = v128.extend_low<u8>(palVecAB);
      const v16_p01b = v128.extend_high<u8>(palVecAB);
      const v16_swappedA = v128.shuffle<i16>(v16_p01a, v16_p01a, 4, 5, 6, 7, 0, 1, 2, 3);
      const v16_swappedB = v128.shuffle<i16>(v16_p01b, v16_p01b, 4, 5, 6, 7, 0, 1, 2, 3);

      const v16_p23a = bc1ComputeP23(v16_p01a, v16_swappedA, c0a > c1a);
      const v16_p23b = bc1ComputeP23(v16_p01b, v16_swappedB, c0b > c1b);

      const palVecA = v128.narrow<u16>(v16_p01a, v16_p23a);
      const palVecB = v128.narrow<u16>(v16_p01b, v16_p23b);

      const baseDstA = dstPtr + <usize>((by * 4 * texW + bx * 4) * 4);
      bc1StoreBlock(palVecA, indicesA, baseDstA, stride, lutBase);
      bc1StoreBlock(palVecB, indicesB, baseDstA + 16, stride, lutBase);
    }

    for (; bx < blocksX; bx++) {
      const off = blocksPtr + <usize>((by * blocksX + bx) * 8);
      const c0 = <i32>load<u16>(off);
      const c1 = <i32>load<u16>(off + 2);
      const indices = load<u32>(off + 4);
      const r0 = rgb565R(c0);
      const g0 = rgb565G(c0);
      const b0 = rgb565B(c0);
      const r1 = rgb565R(c1);
      const g1 = rgb565G(c1);
      const b1 = rgb565B(c1);
      const p0 = r0 | (g0 << 8) | (b0 << 16) | ALPHA;
      const p1 = r1 | (g1 << 8) | (b1 << 16) | ALPHA;
      const vp01_packed = i32x4(p0, p1, 0, 0);
      const v16_p01 = v128.extend_low<u8>(vp01_packed);
      const v16_swapped = v128.shuffle<i16>(v16_p01, v16_p01, 4, 5, 6, 7, 0, 1, 2, 3);
      const v16_p23 = bc1ComputeP23(v16_p01, v16_swapped, c0 > c1);
      const palVec = v128.narrow<u16>(v16_p01, v16_p23);
      const baseDst = dstPtr + <usize>((by * 4 * texW + bx * 4) * 4);
      bc1StoreBlock(palVec, indices, baseDst, stride, lutBase);
    }
  }
}
