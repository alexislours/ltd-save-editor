import { alloc, mark, release } from './arena';
import { deswizzleBlockLinearImpl, swizzleBlockLinearImpl } from './swizzle';
import {
  srgbU8ToLinearF32Impl,
  linearF32ToLinearU8Impl,
  convertLinearU8ToSrgbU8Impl,
} from './color';
import { resizeRgbaImpl } from './resize';
import { bc1DecodeImpl } from './bc1_decode';
import { bc3DecodeImpl } from './bc3_decode';
import { bc1EncodeImpl, bc3EncodeImpl } from './bc_encode';
import { bc1EncodeRgbcxImpl } from './rgbcx';

export { Bc1Mode, FitMode, TextureFormat } from './abi';
export { alloc, mark, release } from './arena';

export function free(ptr: i32): void {}

export function deswizzleBlockLinear(
  srcPtr: i32,
  srcLen: i32,
  dstPtr: i32,
  width: i32,
  height: i32,
  bpe: i32,
  blockHeight: i32,
): void {
  deswizzleBlockLinearImpl(<usize>srcPtr, srcLen, <usize>dstPtr, width, height, bpe, blockHeight);
}

export function swizzleBlockLinear(
  srcPtr: i32,
  srcLen: i32,
  dstPtr: i32,
  dstLen: i32,
  width: i32,
  height: i32,
  bpe: i32,
  blockHeight: i32,
  basePtr: i32,
  baseLen: i32,
): void {
  swizzleBlockLinearImpl(
    <usize>srcPtr,
    srcLen,
    <usize>dstPtr,
    dstLen,
    width,
    height,
    bpe,
    blockHeight,
    <usize>basePtr,
    baseLen,
  );
}

export function srgbU8ToLinearF32(srcPtr: i32, dstPtr: i32, pixelCount: i32): void {
  srgbU8ToLinearF32Impl(<usize>srcPtr, <usize>dstPtr, pixelCount);
}

export function linearF32ToLinearU8(srcPtr: i32, dstPtr: i32, count: i32): void {
  linearF32ToLinearU8Impl(<usize>srcPtr, <usize>dstPtr, count);
}

export function convertLinearU8ToSrgbU8(rgbaPtr: i32, byteLen: i32): void {
  convertLinearU8ToSrgbU8Impl(<usize>rgbaPtr, byteLen);
}

export function bc1Decode(blocksPtr: i32, dstPtr: i32, texW: i32, texH: i32): void {
  bc1DecodeImpl(<usize>blocksPtr, <usize>dstPtr, texW, texH);
}

export function bc3Decode(blocksPtr: i32, dstPtr: i32, texW: i32, texH: i32): void {
  bc3DecodeImpl(<usize>blocksPtr, <usize>dstPtr, texW, texH);
}

export function bc1Encode(
  linRgbaPtr: i32,
  srgbRgbaPtr: i32,
  dstPtr: i32,
  texW: i32,
  texH: i32,
  bc1Mode: i32,
): void {
  bc1EncodeImpl(<usize>linRgbaPtr, <usize>srgbRgbaPtr, <usize>dstPtr, texW, texH, bc1Mode);
}

export function bc3Encode(
  linRgbaPtr: i32,
  srgbRgbaPtr: i32,
  dstPtr: i32,
  texW: i32,
  texH: i32,
): void {
  bc3EncodeImpl(<usize>linRgbaPtr, <usize>srgbRgbaPtr, <usize>dstPtr, texW, texH);
}

export function bc1EncodeRgbcx(linRgbaPtr: i32, dstPtr: i32, texW: i32, texH: i32): void {
  bc1EncodeRgbcxImpl(<usize>linRgbaPtr, <usize>dstPtr, texW, texH);
}

export function resizeRgba(
  srcPtr: i32,
  srcW: i32,
  srcH: i32,
  dstPtr: i32,
  dstW: i32,
  dstH: i32,
  fitMode: i32,
  matteR: i32,
  matteG: i32,
  matteB: i32,
  matteA: i32,
): void {
  resizeRgbaImpl(
    <usize>srcPtr,
    srcW,
    srcH,
    <usize>dstPtr,
    dstW,
    dstH,
    fitMode,
    matteR,
    matteG,
    matteB,
    matteA,
  );
}
