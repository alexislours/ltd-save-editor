export function divRoundUp(n: i32, d: i32): i32 {
  return (n + d - 1) / d;
}

export function gobAddress(x: i32, y: i32, widthInGobs: i32, bpe: i32, blockHeight: i32): i32 {
  const xBytes = x * bpe;
  const gobAddr =
    (y / (8 * blockHeight)) * 512 * blockHeight * widthInGobs +
    (xBytes / 64) * 512 * blockHeight +
    ((y % (8 * blockHeight)) / 8) * 512;
  const xInGob = xBytes % 64;
  const yInGob = y % 8;
  return (
    gobAddr +
    ((xInGob % 64) / 32) * 256 +
    ((yInGob % 8) / 2) * 64 +
    ((xInGob % 32) / 16) * 32 +
    (yInGob % 2) * 16 +
    (xInGob % 16)
  );
}

@inline
function deswizzleGobAlignedSimd(
  srcPtr: usize,
  dstPtr: usize,
  height: i32,
  blockHeight: i32,
  widthInGobs: i32,
  rowStrideBytes: i32,
): void {
  const rowsPerBlock = 8 * blockHeight;
  const blockStride = 512 * blockHeight * widthInGobs;
  const gobColStride = 512 * blockHeight;
  for (let y = 0; y < height; y++) {
    const blockY = y / rowsPerBlock;
    const yInBlock = y - blockY * rowsPerBlock;
    const gobYIdx = yInBlock >> 3;
    const yInGob = y & 7;
    const yPart = ((yInGob >> 1) << 6) | ((yInGob & 1) << 4);
    const yOuter = blockY * blockStride + gobYIdx * 512 + yPart;
    const dstRowBase = y * rowStrideBytes;
    for (let gobX = 0; gobX < widthInGobs; gobX++) {
      const srcAddr = srcPtr + <usize>(yOuter + gobX * gobColStride);
      const dstAddr = dstPtr + <usize>(dstRowBase + (gobX << 6));
      v128.store(dstAddr, v128.load(srcAddr));
      v128.store(dstAddr, v128.load(srcAddr, 32), 16);
      v128.store(dstAddr, v128.load(srcAddr, 256), 32);
      v128.store(dstAddr, v128.load(srcAddr, 288), 48);
    }
  }
}

export function deswizzleBlockLinearImpl(
  srcPtr: usize,
  srcLen: i32,
  dstPtr: usize,
  width: i32,
  height: i32,
  bpe: i32,
  blockHeight: i32,
): void {
  const widthInGobs = divRoundUp(width * bpe, 64);
  if ((bpe == 8 || bpe == 16) && width * bpe >= 64 && (width * bpe) % 64 == 0) {
    const paddedHeight = divRoundUp(height, 8 * blockHeight) * (8 * blockHeight);
    const paddedSize = widthInGobs * paddedHeight * 64;
    if (srcLen >= paddedSize) {
      deswizzleGobAlignedSimd(srcPtr, dstPtr, height, blockHeight, widthInGobs, width * bpe);
      return;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const swizzled = gobAddress(x, y, widthInGobs, bpe, blockHeight);
      const linear = (y * width + x) * bpe;
      if (swizzled + bpe <= srcLen) {
        memory.copy(dstPtr + <usize>linear, srcPtr + <usize>swizzled, <usize>bpe);
      } else {
        for (let i = 0; i < bpe; i++) {
          const off = swizzled + i;
          const v: u8 = off < srcLen ? load<u8>(srcPtr + <usize>off) : <u8>0;
          store<u8>(dstPtr + <usize>(linear + i), v);
        }
      }
    }
  }
}

@inline
function swizzleGobAlignedSimd(
  srcPtr: usize,
  dstPtr: usize,
  height: i32,
  blockHeight: i32,
  widthInGobs: i32,
  rowStrideBytes: i32,
): void {
  const blocksY = (height + 8 * blockHeight - 1) / (8 * blockHeight);
  const blockStride = 512 * blockHeight * widthInGobs;
  const gobColStride = 512 * blockHeight;
  for (let blockY = 0; blockY < blocksY; blockY++) {
    const blockBase = blockY * blockStride;
    const blockY0 = blockY * 8 * blockHeight;
    for (let gobX = 0; gobX < widthInGobs; gobX++) {
      const colBase = blockBase + gobX * gobColStride;
      const srcGobX = gobX << 6;
      for (let gobYIdx = 0; gobYIdx < blockHeight; gobYIdx++) {
        const y0 = blockY0 + gobYIdx * 8;
        if (y0 >= height) break;
        const dstGob = dstPtr + <usize>(colBase + gobYIdx * 512);
        const sR0 = srcPtr + <usize>(y0 * rowStrideBytes + srcGobX);
        const sR1 = sR0 + <usize>rowStrideBytes;
        const sR2 = sR1 + <usize>rowStrideBytes;
        const sR3 = sR2 + <usize>rowStrideBytes;
        const sR4 = sR3 + <usize>rowStrideBytes;
        const sR5 = sR4 + <usize>rowStrideBytes;
        const sR6 = sR5 + <usize>rowStrideBytes;
        const sR7 = sR6 + <usize>rowStrideBytes;
        v128.store(dstGob, v128.load(sR0), 0);
        v128.store(dstGob, v128.load(sR1), 16);
        v128.store(dstGob, v128.load(sR0, 16), 32);
        v128.store(dstGob, v128.load(sR1, 16), 48);
        v128.store(dstGob, v128.load(sR2), 64);
        v128.store(dstGob, v128.load(sR3), 80);
        v128.store(dstGob, v128.load(sR2, 16), 96);
        v128.store(dstGob, v128.load(sR3, 16), 112);
        v128.store(dstGob, v128.load(sR4), 128);
        v128.store(dstGob, v128.load(sR5), 144);
        v128.store(dstGob, v128.load(sR4, 16), 160);
        v128.store(dstGob, v128.load(sR5, 16), 176);
        v128.store(dstGob, v128.load(sR6), 192);
        v128.store(dstGob, v128.load(sR7), 208);
        v128.store(dstGob, v128.load(sR6, 16), 224);
        v128.store(dstGob, v128.load(sR7, 16), 240);
        v128.store(dstGob, v128.load(sR0, 32), 256);
        v128.store(dstGob, v128.load(sR1, 32), 272);
        v128.store(dstGob, v128.load(sR0, 48), 288);
        v128.store(dstGob, v128.load(sR1, 48), 304);
        v128.store(dstGob, v128.load(sR2, 32), 320);
        v128.store(dstGob, v128.load(sR3, 32), 336);
        v128.store(dstGob, v128.load(sR2, 48), 352);
        v128.store(dstGob, v128.load(sR3, 48), 368);
        v128.store(dstGob, v128.load(sR4, 32), 384);
        v128.store(dstGob, v128.load(sR5, 32), 400);
        v128.store(dstGob, v128.load(sR4, 48), 416);
        v128.store(dstGob, v128.load(sR5, 48), 432);
        v128.store(dstGob, v128.load(sR6, 32), 448);
        v128.store(dstGob, v128.load(sR7, 32), 464);
        v128.store(dstGob, v128.load(sR6, 48), 480);
        v128.store(dstGob, v128.load(sR7, 48), 496);
      }
    }
  }
}

export function swizzleBlockLinearImpl(
  srcPtr: usize,
  srcLen: i32,
  dstPtr: usize,
  dstLen: i32,
  width: i32,
  height: i32,
  bpe: i32,
  blockHeight: i32,
  basePtr: usize,
  baseLen: i32,
): void {
  const widthInGobs = divRoundUp(width * bpe, 64);
  const paddedHeight = divRoundUp(height, 8 * blockHeight) * (8 * blockHeight);
  const paddedSize = widthInGobs * paddedHeight * 64;

  if (basePtr != 0 && baseLen == paddedSize && dstLen >= paddedSize) {
    memory.copy(dstPtr, basePtr, <usize>paddedSize);
  } else {
    memory.fill(dstPtr, 0, <usize>dstLen);
  }

  if (
    (bpe == 8 || bpe == 16) &&
    width * bpe >= 64 &&
    (width * bpe) % 64 == 0 &&
    (height & 7) == 0 &&
    dstLen >= paddedSize &&
    srcLen >= width * height * bpe
  ) {
    swizzleGobAlignedSimd(srcPtr, dstPtr, height, blockHeight, widthInGobs, width * bpe);
    return;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const linear = (y * width + x) * bpe;
      const swizzled = gobAddress(x, y, widthInGobs, bpe, blockHeight);
      if (linear + bpe <= srcLen && swizzled + bpe <= dstLen) {
        memory.copy(dstPtr + <usize>swizzled, srcPtr + <usize>linear, <usize>bpe);
      }
    }
  }
}
