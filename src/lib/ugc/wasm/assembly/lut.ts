export const SRGB_U8_TO_LINEAR_F32 = new StaticArray<f32>(256);
export const LINEAR_U8_TO_SRGB_U8 = new StaticArray<u8>(256);
export const LINEAR_U8_TO_GAMMA_DERIV2 = new StaticArray<f32>(256);
export const U8_DIV_255_F32 = new StaticArray<f32>(256);

for (let i = 0; i < 256; i++) {
  const s = <f64>i / 255.0;
  const lin = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  SRGB_U8_TO_LINEAR_F32[i] = <f32>lin;
  U8_DIV_255_F32[i] = <f32>(<f64>i / 255.0);
}

for (let i = 0; i < 256; i++) {
  const lin = <f64>i / 255.0;
  const sV = lin <= 0.0031308 ? lin * 12.92 : 1.055 * Math.pow(lin, 1.0 / 2.4) - 0.055;
  let v = <i32>Math.round(sV * 255.0);
  if (v < 0) v = 0;
  else if (v > 255) v = 255;
  LINEAR_U8_TO_SRGB_U8[i] = <u8>v;
}

for (let i = 0; i < 256; i++) {
  const L = <f64>i / 255.0;
  const dS_dL = L <= 0.0031308 ? 12.92 : (1.055 / 2.4) * Math.pow(L, 1.0 / 2.4 - 1.0);
  LINEAR_U8_TO_GAMMA_DERIV2[i] = <f32>(dS_dL * dS_dL);
}
