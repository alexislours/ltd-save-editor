import { murmur3_x86_32 } from '../sav/hash';

export function locateOffsetByHash(bytes: Uint8Array, hash: number): number | null {
  const target = new Uint8Array(4);
  target[0] = hash & 0xff;
  target[1] = (hash >>> 8) & 0xff;
  target[2] = (hash >>> 16) & 0xff;
  target[3] = (hash >>> 24) & 0xff;

  const limit = bytes.byteLength - 8;
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === target[0] &&
      bytes[i + 1] === target[1] &&
      bytes[i + 2] === target[2] &&
      bytes[i + 3] === target[3]
    ) {
      const dv = new DataView(bytes.buffer, bytes.byteOffset + i + 4, 4);
      return dv.getUint32(0, true);
    }
  }
  return null;
}

export function locateOffsetByName(bytes: Uint8Array, name: string): number | null {
  return locateOffsetByHash(bytes, murmur3_x86_32(name));
}

export function requireOffset(bytes: Uint8Array, name: string): number {
  const off = locateOffsetByName(bytes, name);
  if (off === null) throw new Error(`Hash entry not found: ${name}`);
  return off + 4;
}
