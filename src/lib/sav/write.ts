import { DATA_TYPE_COUNT, DataType, isInline } from './dataType';
import type { Entry, SavFile } from './types';

export function writeSav(save: SavFile): Uint8Array {
  const bySection: Entry[][] = Array.from({ length: DATA_TYPE_COUNT }, () => []);
  for (const e of save.entries) {
    if (e.type < 0 || e.type >= DATA_TYPE_COUNT) {
      throw new Error(`Entry has invalid DataType ${e.type}`);
    }
    bySection[e.type].push(e);
  }

  let rowCount = DATA_TYPE_COUNT;
  for (const s of bySection) rowCount += s.length;
  const saveDataOffset = 0x20 + rowCount * 8;

  const offsets = new Map<Entry, number>();
  let heapPos = saveDataOffset;
  for (let t = 0; t < DATA_TYPE_COUNT; t++) {
    for (const e of bySection[t]) {
      if (isInline(e.type)) continue;
      if (e.type === DataType.Bool64bitKey && e.payload == null) {
        offsets.set(e, 0);
        continue;
      }
      if (!e.payload) {
        throw new Error(`Entry 0x${e.hash.toString(16)} (${t}) is missing its heap payload`);
      }
      offsets.set(e, heapPos);
      heapPos += e.payload.byteLength;
    }
  }

  const out = new Uint8Array(heapPos);
  const dv = new DataView(out.buffer);

  // Header
  out[0] = 0x04;
  out[1] = 0x03;
  out[2] = 0x02;
  out[3] = 0x01;
  dv.setUint32(4, save.version, true);
  dv.setUint32(8, saveDataOffset, true);

  let p = 0x20;
  for (let t = 0; t < DATA_TYPE_COUNT; t++) {
    dv.setUint32(p, 0, true);
    p += 4;
    dv.setUint32(p, t, true);
    p += 4;
    for (const e of bySection[t]) {
      dv.setUint32(p, e.hash >>> 0, true);
      p += 4;
      if (isInline(e.type)) {
        dv.setUint32(p, (e.inlineRaw ?? 0) >>> 0, true);
      } else {
        dv.setUint32(p, offsets.get(e)! >>> 0, true);
      }
      p += 4;
    }
  }

  for (let t = 0; t < DATA_TYPE_COUNT; t++) {
    for (const e of bySection[t]) {
      if (isInline(e.type)) continue;
      if (e.type === DataType.Bool64bitKey && e.payload == null) continue;
      out.set(e.payload!, offsets.get(e)!);
    }
  }

  return out;
}
