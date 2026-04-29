import { ShareMiiError } from './errors';

const MII_BLOCK = 156;
const PERSONALITY_LEN = 18 * 4;
const NAME_LEN = 64;
const PRONOUNCE_LEN = 128;
const SEXUALITY_LEN = 4;

const MARK_CANVAS = new Uint8Array([0xa3, 0xa3, 0xa3, 0xa3]);
const MARK_UGC = new Uint8Array([0xa4, 0xa4, 0xa4, 0xa4]);
const MARK_NAME = new Uint8Array([0xa2, 0xa2, 0xa2, 0xa2]);
const MARK_THUMB = new Uint8Array([0xa5, 0xa5, 0xa5, 0xa5]);

export type LtdMii = {
  version: number;
  /** Original version from the file before upgradeToV3; v1 has no personality data. */
  originalVersion: number;
  hasCanvas: boolean;
  hasUgcTex: boolean;
  miiBlock: Uint8Array;
  personality: Uint8Array;
  name: Uint8Array;
  pronounce: Uint8Array;
  sexuality: Uint8Array;
  canvasTex: Uint8Array;
  ugcTex: Uint8Array;
};

export function encodeLtdMii(m: LtdMii): Uint8Array {
  if (m.miiBlock.byteLength !== MII_BLOCK) throw new Error('miiBlock must be 156 bytes');
  if (m.personality.byteLength !== PERSONALITY_LEN) throw new Error('personality must be 72 bytes');
  if (m.name.byteLength !== NAME_LEN) throw new Error('name must be 64 bytes');
  if (m.pronounce.byteLength !== PRONOUNCE_LEN) throw new Error('pronounce must be 128 bytes');
  if (m.sexuality.byteLength !== SEXUALITY_LEN) throw new Error('sexuality must be 4 bytes');

  const total =
    4 +
    MII_BLOCK +
    PERSONALITY_LEN +
    NAME_LEN +
    PRONOUNCE_LEN +
    SEXUALITY_LEN +
    4 +
    m.canvasTex.byteLength +
    4 +
    m.ugcTex.byteLength;
  const out = new Uint8Array(total);
  let p = 0;
  out[p++] = m.version & 0xff;
  out[p++] = m.hasCanvas ? 1 : 0;
  out[p++] = m.hasUgcTex ? 1 : 0;
  out[p++] = 0;
  out.set(m.miiBlock, p);
  p += MII_BLOCK;
  out.set(m.personality, p);
  p += PERSONALITY_LEN;
  out.set(m.name, p);
  p += NAME_LEN;
  out.set(m.pronounce, p);
  p += PRONOUNCE_LEN;
  out.set(m.sexuality, p);
  p += SEXUALITY_LEN;
  out.set(MARK_CANVAS, p);
  p += 4;
  out.set(m.canvasTex, p);
  p += m.canvasTex.byteLength;
  out.set(MARK_UGC, p);
  p += 4;
  out.set(m.ugcTex, p);
  return out;
}

export function decodeLtdMii(bytes: Uint8Array): LtdMii {
  if (bytes.byteLength < 4) throw new ShareMiiError('invalid_ltd_file');
  let buf: Uint8Array = new Uint8Array(bytes);
  const originalVersion = buf[0];
  let version = originalVersion;
  if (version < 1 || version > 3) {
    throw new ShareMiiError('unsupported_ltd_version', { version });
  }

  if (version < 3) {
    buf = upgradeToV3(buf);
    version = 3;
  }

  const hasCanvas = buf[1] !== 0;
  const hasUgcTex = buf[2] !== 0;
  let p = 4;
  const miiBlock = buf.slice(p, p + MII_BLOCK);
  p += MII_BLOCK;
  const personality = buf.slice(p, p + PERSONALITY_LEN);
  p += PERSONALITY_LEN;
  const name = buf.slice(p, p + NAME_LEN);
  p += NAME_LEN;
  const pronounce = buf.slice(p, p + PRONOUNCE_LEN);
  p += PRONOUNCE_LEN;
  const sexuality = buf.slice(p, p + SEXUALITY_LEN);
  p += SEXUALITY_LEN;

  const canvasStart = findMarker(buf, MARK_CANVAS, p);
  if (canvasStart < 0) throw new ShareMiiError('ltd_missing_marker', { marker: 'canvas' });
  const ugcStart = findMarker(buf, MARK_UGC, canvasStart + 4);
  if (ugcStart < 0) throw new ShareMiiError('ltd_missing_marker', { marker: 'ugc' });

  const canvasTex = buf.slice(canvasStart + 4, ugcStart);
  const ugcTex = buf.slice(ugcStart + 4);

  return {
    version,
    originalVersion,
    hasCanvas,
    hasUgcTex,
    miiBlock,
    personality,
    name,
    pronounce,
    sexuality,
    canvasTex,
    ugcTex,
  };
}

function upgradeToV3(input: Uint8Array): Uint8Array {
  const mii = Array.from(input);
  const originalVersion = mii[0];
  mii.splice(4, 1);
  if (originalVersion === 2) {
    mii.splice(427, 0, 0);
    const canvasMarkerStart = findMarkerArr(mii, [0xa3, 0xa3, 0xa3]);
    if (canvasMarkerStart < 0)
      throw new ShareMiiError('ltd_missing_marker', { marker: 'v2_canvas' });
    const canvasStart = canvasMarkerStart + 3;
    const ugcMarkerStart = lastFindMarkerArr(mii, [0xa3, 0xa3, 0xa3]);
    mii.splice(canvasStart, 0, 0xa3);
    mii[ugcMarkerStart + 1] = 0xa4;
    mii[ugcMarkerStart + 2] = 0xa4;
    mii[ugcMarkerStart + 3] = 0xa4;
    mii.splice(ugcMarkerStart + 3, 0, 0xa4);
  }
  mii[0] = 3;
  return new Uint8Array(mii);
}

function findMarker(buf: Uint8Array, marker: Uint8Array, from: number): number {
  outer: for (let i = from; i <= buf.byteLength - marker.byteLength; i++) {
    for (let j = 0; j < marker.byteLength; j++) {
      if (buf[i + j] !== marker[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function findMarkerArr(buf: number[], marker: number[]): number {
  outer: for (let i = 0; i <= buf.length - marker.length; i++) {
    for (let j = 0; j < marker.length; j++) {
      if (buf[i + j] !== marker[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function lastFindMarkerArr(buf: number[], marker: number[]): number {
  outer: for (let i = buf.length - marker.length; i >= 0; i--) {
    for (let j = 0; j < marker.length; j++) {
      if (buf[i + j] !== marker[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export type LtdUgc = {
  kindIndex: number;
  fields: Uint8Array;
  vector: Uint8Array;
  vector2: Uint8Array;
  name: Uint8Array;
  pronounce: Uint8Array;
  goodsText?: Uint8Array;
  goodsPronounce?: Uint8Array;
  canvasTex: Uint8Array;
  ugcTex: Uint8Array;
  thumbTex: Uint8Array;
};

export function encodeLtdUgc(u: LtdUgc): Uint8Array {
  const ltdHeader = new Uint8Array([u.kindIndex & 0xff, 0, 0, 0]);
  const namesBlock = u.goodsText
    ? concat(u.name, u.pronounce, u.goodsText, u.goodsPronounce ?? new Uint8Array(0))
    : concat(u.name, u.pronounce);

  return concat(
    ltdHeader,
    u.fields,
    u.vector,
    u.vector2,
    MARK_NAME,
    namesBlock,
    MARK_CANVAS,
    u.canvasTex,
    MARK_UGC,
    u.ugcTex,
    MARK_THUMB,
    u.thumbTex,
  );
}

export type LtdUgcSection = {
  kindIndex: number;
  fieldsAndVectors: Uint8Array;
  namesBlock: Uint8Array;
  canvasTex: Uint8Array;
  ugcTex: Uint8Array;
  thumbTex: Uint8Array;
};

export function decodeLtdUgc(bytes: Uint8Array): LtdUgcSection {
  if (bytes.byteLength < 4) throw new ShareMiiError('invalid_ltd_file');
  const kindIndex = bytes[0];

  const nameStart = findMarker(bytes, MARK_NAME, 4);
  if (nameStart < 0) throw new ShareMiiError('ltd_missing_marker', { marker: 'name' });
  const canvasStart = findMarker(bytes, MARK_CANVAS, nameStart + 4);
  if (canvasStart < 0) throw new ShareMiiError('ltd_missing_marker', { marker: 'canvas' });
  const ugcStart = findMarker(bytes, MARK_UGC, canvasStart + 4);
  if (ugcStart < 0) throw new ShareMiiError('ltd_missing_marker', { marker: 'ugc' });
  const thumbStart = findMarker(bytes, MARK_THUMB, ugcStart + 4);
  if (thumbStart < 0) throw new ShareMiiError('ltd_missing_marker', { marker: 'thumb' });

  return {
    kindIndex,
    fieldsAndVectors: bytes.slice(4, nameStart),
    namesBlock: bytes.slice(nameStart + 4, canvasStart),
    canvasTex: bytes.slice(canvasStart + 4, ugcStart),
    ugcTex: bytes.slice(ugcStart + 4, thumbStart),
    thumbTex: bytes.slice(thumbStart + 4),
  };
}

function concat(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out;
}
