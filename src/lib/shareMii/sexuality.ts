export function decodeSexuality(data: Uint8Array): number[] {
  const bits: number[] = [];
  for (const byte of data) {
    for (let i = 0; i < 8; i++) {
      bits.push((byte >> i) & 1);
    }
  }
  return bits;
}

export function encodeSexuality(bits: number[]): Uint8Array {
  if (bits.length % 8 !== 0) throw new Error('Bit list length must be a multiple of 8');
  const out = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte |= (bits[i + j] & 1) << j;
    }
    out[i / 8] = byte;
  }
  return out;
}
