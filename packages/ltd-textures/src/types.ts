/**
 * BC1 endpoint selection strategy used by the encoder.
 *
 * - `Auto` lets the encoder pick three- or four-color mode per block.
 * - `FourColor` forces the opaque four-color layout.
 * - `ThreeColor` forces the three-color layout with a 1-bit punch-through alpha.
 */
export const Bc1Mode = {
  Auto: 0,
  FourColor: 1,
  ThreeColor: 2,
} as const;
/** A {@link Bc1Mode} value. */
export type Bc1Mode = (typeof Bc1Mode)[keyof typeof Bc1Mode];

/**
 * How a source image is fitted into the destination rectangle when resizing.
 *
 * - `Fill` stretches to the exact destination, ignoring aspect ratio.
 * - `Contain` scales to fit inside and pads the remainder with the matte.
 * - `Cover` scales to cover the destination and crops the overflow.
 */
export const FitMode = {
  Fill: 0,
  Contain: 1,
  Cover: 2,
} as const;
/** A {@link FitMode} value. */
export type FitMode = (typeof FitMode)[keyof typeof FitMode];

/** Straight (non-premultiplied) RGBA fill color, each channel in `[0, 255]`, used to pad letterboxed regions when {@link FitMode.Contain} is selected. */
export type Matte = { r: number; g: number; b: number; a: number };
