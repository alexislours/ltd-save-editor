export const Bc1Mode = {
  Auto: 0,
  FourColor: 1,
  ThreeColor: 2,
} as const;
export type Bc1Mode = (typeof Bc1Mode)[keyof typeof Bc1Mode];

export const FitMode = {
  Fill: 0,
  Contain: 1,
  Cover: 2,
} as const;
export type FitMode = (typeof FitMode)[keyof typeof FitMode];

export type Matte = { r: number; g: number; b: number; a: number };
