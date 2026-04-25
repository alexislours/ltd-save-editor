import { DataType, isInline } from './dataType';
import type { Entry, SavFile } from './types';

const MAGIC = [0x04, 0x03, 0x02, 0x01] as const;

export function parseSav(bytes: Uint8Array): SavFile {
  if (bytes.byteLength < 0x20) {
    throw new Error('File is too small to be a .sav');
  }
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== MAGIC[i]) {
      throw new Error('Bad magic: this is not a Tomodachi Life .sav file');
    }
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = dv.getUint32(4, true);
  const saveDataOffset = dv.getUint32(8, true);
  if (saveDataOffset < 0x20 || saveDataOffset > bytes.byteLength) {
    throw new Error(`saveDataOffset out of range: 0x${saveDataOffset.toString(16)}`);
  }

  const entries: Entry[] = [];
  let pos = 0x20;
  let currentType: DataType = DataType.Bool;

  while (pos < saveDataOffset) {
    const hash = dv.getUint32(pos, true);
    pos += 4;
    const slot = dv.getUint32(pos, true);
    pos += 4;
    if (hash === 0) {
      currentType = slot as DataType;
      continue;
    }
    if (isInline(currentType)) {
      entries.push({ hash, type: currentType, inlineRaw: slot });
    } else {
      const payload = readHeapPayload(bytes, dv, slot, currentType);
      entries.push({ hash, type: currentType, payload });
    }
  }

  return { version, entries };
}

function readHeapPayload(
  bytes: Uint8Array,
  dv: DataView,
  offset: number,
  type: DataType,
): Uint8Array | null {
  if (type === DataType.Bool64bitKey) {
    return offset === 0 ? null : readBool64bitKeyPayload(bytes, dv, offset);
  }

  const fixed = fixedHeapSize(type);
  if (fixed !== null) {
    checkRange(bytes, offset, fixed, type);
    return bytes.slice(offset, offset + fixed);
  }
  return readVariable(bytes, dv, offset, type);
}

function fixedHeapSize(t: DataType): number | null {
  switch (t) {
    case DataType.Int64:
    case DataType.UInt64:
      return 8;
    case DataType.Vector2:
      return 8;
    case DataType.Vector3:
      return 12;
    case DataType.String16:
      return 16;
    case DataType.String32:
      return 32;
    case DataType.String64:
      return 64;
    case DataType.WString16:
      return 32;
    case DataType.WString32:
      return 64;
    case DataType.WString64:
      return 128;
    default:
      return null;
  }
}

function readVariable(bytes: Uint8Array, dv: DataView, offset: number, t: DataType): Uint8Array {
  checkRange(bytes, offset, 4, t);
  const count = dv.getUint32(offset, true);

  switch (t) {
    case DataType.Binary: {
      const size = count;
      return sliceSafe(bytes, offset, 4 + size, t);
    }
    case DataType.BoolArray: {
      const byteSize = Math.max(4, Math.ceil(count / 8));
      const aligned = (byteSize + 3) & ~3;
      return sliceSafe(bytes, offset, 4 + aligned, t);
    }
    case DataType.IntArray:
    case DataType.UIntArray:
    case DataType.FloatArray:
    case DataType.EnumArray:
      return sliceSafe(bytes, offset, 4 + count * 4, t);
    case DataType.Int64Array:
    case DataType.UInt64Array:
    case DataType.Vector2Array:
      return sliceSafe(bytes, offset, 4 + count * 8, t);
    case DataType.Vector3Array:
      return sliceSafe(bytes, offset, 4 + count * 12, t);
    case DataType.String16Array:
      return sliceSafe(bytes, offset, 4 + count * 16, t);
    case DataType.String32Array:
      return sliceSafe(bytes, offset, 4 + count * 32, t);
    case DataType.String64Array:
      return sliceSafe(bytes, offset, 4 + count * 64, t);
    case DataType.WString16Array:
      return sliceSafe(bytes, offset, 4 + count * 32, t);
    case DataType.WString32Array:
      return sliceSafe(bytes, offset, 4 + count * 64, t);
    case DataType.WString64Array:
      return sliceSafe(bytes, offset, 4 + count * 128, t);
    case DataType.BinaryArray: {
      let p = offset + 4;
      for (let i = 0; i < count; i++) {
        checkRange(bytes, p, 4, t);
        const sz = dv.getUint32(p, true);
        p += 4 + sz;
        if (p > bytes.byteLength) {
          throw new Error(`BinaryArray element ${i} at 0x${p.toString(16)} overruns file`);
        }
      }
      return bytes.slice(offset, p);
    }
    default:
      throw new Error(`Unsupported variable heap type ${t}`);
  }
}

function readBool64bitKeyPayload(_bytes: Uint8Array, _dv: DataView, offset: number): Uint8Array {
  throw new Error(`Bool64bitKey with non-null offset 0x${offset.toString(16)} is not supported`);
}

function checkRange(bytes: Uint8Array, offset: number, len: number, t: DataType): void {
  if (offset < 0 || offset + len > bytes.byteLength) {
    throw new Error(
      `Heap read out of range for DataType ${t} at offset 0x${offset.toString(16)} (len ${len})`,
    );
  }
}

function sliceSafe(bytes: Uint8Array, offset: number, len: number, t: DataType): Uint8Array {
  checkRange(bytes, offset, len, t);
  return bytes.slice(offset, offset + len);
}
