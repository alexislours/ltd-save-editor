import { DataType } from '$lib/sav/dataType';
import { hexU32 } from '$lib/sav/format';
import { enumOptionName } from '$lib/sav/knownKeys';
import { decodeStruct } from '$lib/sav/struct/decode';
import { structForHash } from '$lib/sav/struct/registry';
import type { DecodedNode } from '$lib/sav/struct/types';

const MAX_ARRAY_PREVIEW = 16;
const MAX_BYTES_PREVIEW = 8;

const MISSING = '(unset)';

type Vec = { x: number; y: number; z?: number };

function isVec(value: unknown): value is Vec {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Vec).x === 'number' &&
    typeof (value as Vec).y === 'number'
  );
}

function numEqual(a: number, b: number): boolean {
  return a === b || (Number.isNaN(a) && Number.isNaN(b));
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'bigint' || typeof b === 'bigint') return a === b;
  if (typeof a === 'number' && typeof b === 'number') return numEqual(a, b);
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!valuesEqual(a[i], b[i])) return false;
    return true;
  }
  if (isVec(a) && isVec(b)) {
    return numEqual(a.x, b.x) && numEqual(a.y, b.y) && numEqual(a.z ?? 0, b.z ?? 0);
  }
  return false;
}

function formatFloat(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(7)));
}

function hexByte(b: number): string {
  return `0x${b.toString(16).padStart(2, '0')}`;
}

function formatBytes(bytes: Uint8Array): string {
  const head = Array.from(bytes.slice(0, MAX_BYTES_PREVIEW), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join(' ');
  if (bytes.length === 0) return '<0 bytes>';
  const ellipsis = bytes.length > MAX_BYTES_PREVIEW ? ' …' : '';
  return `<${bytes.length} bytes: ${head}${ellipsis}>`;
}

function formatVec(value: Vec): string {
  const parts = [formatFloat(value.x), formatFloat(value.y)];
  if (typeof value.z === 'number') parts.push(formatFloat(value.z));
  return `(${parts.join(', ')})`;
}

function formatScalar(value: unknown, isEnum: boolean): string {
  if (value === undefined) return MISSING;
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return JSON.stringify(value);
  if (value instanceof Uint8Array) return formatBytes(value);
  if (typeof value === 'number') {
    if (isEnum) return enumOptionName(value >>> 0) ?? hexU32(value);
    return formatFloat(value);
  }
  if (isVec(value)) return formatVec(value);
  return String(value);
}

export function formatValue(type: DataType | null, value: unknown): string {
  if (value === undefined) return MISSING;
  if (value === null && type === DataType.Bool64bitKey) return 'present';
  const isEnum = type === DataType.Enum || type === DataType.EnumArray;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[] (empty)';
    const shown = value.slice(0, MAX_ARRAY_PREVIEW).map((v) => formatScalar(v, isEnum));
    const more = value.length - shown.length;
    return `[${shown.join(', ')}${more > 0 ? `, … +${more}` : ''}]`;
  }
  return formatScalar(value, isEnum);
}

export function typeLabel(type: DataType | null): string {
  if (type === null) return 'raw';
  return DataType[type] ?? String(type);
}

type ElementChange = {
  label: string;
  status: 'changed' | 'added' | 'removed';
  before: string;
  after: string;
};

export type ArrayDiff = { changes: ElementChange[]; total: number };

function arrayElementChanges(
  type: DataType | null,
  before: unknown,
  after: unknown,
): ArrayDiff | null {
  if (!Array.isArray(before) || !Array.isArray(after)) return null;
  const out: ElementChange[] = [];
  const len = Math.max(before.length, after.length);
  for (let i = 0; i < len; i++) {
    const inBefore = i < before.length;
    const inAfter = i < after.length;
    const label = `[${i}]`;
    if (inBefore && inAfter) {
      if (valuesEqual(before[i], after[i])) continue;
      out.push({
        label,
        status: 'changed',
        before: formatValue(type, before[i]),
        after: formatValue(type, after[i]),
      });
    } else if (inAfter) {
      out.push({ label, status: 'added', before: '', after: formatValue(type, after[i]) });
    } else {
      out.push({ label, status: 'removed', before: formatValue(type, before[i]), after: '' });
    }
  }
  if (out.length === 0) return null;
  return { changes: out, total: len };
}

function byteElementChanges(before: unknown, after: unknown): ArrayDiff | null {
  if (!(before instanceof Uint8Array) || !(after instanceof Uint8Array)) return null;
  const out: ElementChange[] = [];
  const len = Math.max(before.length, after.length);
  for (let i = 0; i < len; i++) {
    const inBefore = i < before.length;
    const inAfter = i < after.length;
    const label = `[${i}]`;
    if (inBefore && inAfter) {
      if (before[i] === after[i]) continue;
      out.push({ label, status: 'changed', before: hexByte(before[i]), after: hexByte(after[i]) });
    } else if (inAfter) {
      out.push({ label, status: 'added', before: '', after: hexByte(after[i]) });
    } else {
      out.push({ label, status: 'removed', before: hexByte(before[i]), after: '' });
    }
  }
  if (out.length === 0) return null;
  return { changes: out, total: len };
}

function structBytes(value: unknown): Uint8Array | null {
  return value instanceof Uint8Array ? value : null;
}

function formatNode(node: DecodedNode): string {
  if (node.codec) {
    const v = node.value;
    if (v.kind === 'number' || v.kind === 'bigint') return node.codec.display(v.value);
  }
  if (node.summary != null && node.summary !== '') return node.summary;
  const v = node.value;
  switch (v.kind) {
    case 'number':
      if (node.type.kind === 'prim' && node.type.enumOptions) {
        return node.type.enumOptions[v.value] ?? formatFloat(v.value);
      }
      return formatFloat(v.value);
    case 'bigint':
      return v.value.toString();
    case 'text':
      return JSON.stringify(v.value);
    case 'bytes':
      return formatBytes(v.value);
    case 'group':
      return '';
  }
}

function collectTerminals(node: DecodedNode, out: DecodedNode[]): void {
  if (node.summary != null && node.summary !== '') {
    out.push(node);
    return;
  }
  if (node.children && node.children.length > 0) {
    for (const child of node.children) collectTerminals(child, out);
    return;
  }
  out.push(node);
}

function terminalEqual(a: DecodedNode, b: DecodedNode): boolean {
  const va = a.value;
  const vb = b.value;
  if (va.kind !== vb.kind) return false;
  switch (va.kind) {
    case 'number':
      return numEqual(va.value, (vb as { kind: 'number'; value: number }).value);
    case 'bigint':
      return va.value === (vb as { kind: 'bigint'; value: bigint }).value;
    case 'text':
      return va.value === (vb as { kind: 'text'; value: string }).value;
    case 'bytes': {
      const ob = (vb as { kind: 'bytes'; value: Uint8Array }).value;
      if (va.value.length !== ob.length) return false;
      for (let i = 0; i < va.value.length; i++) if (va.value[i] !== ob[i]) return false;
      return true;
    }
    case 'group': {
      const ca = a.children ?? [];
      const cb = b.children ?? [];
      if (ca.length !== cb.length) return false;
      for (let i = 0; i < ca.length; i++) if (!terminalEqual(ca[i], cb[i])) return false;
      return true;
    }
  }
}

function structFieldChanges(hash: number, before: unknown, after: unknown): ArrayDiff | null {
  const a = structBytes(before);
  const b = structBytes(after);
  if (!a || !b) return null;
  const def = structForHash(hash, Math.min(a.length, b.length));
  if (!def) return null;
  let rootA: DecodedNode;
  let rootB: DecodedNode;
  try {
    rootA = decodeStruct(def, a);
    rootB = decodeStruct(def, b);
  } catch {
    return null;
  }
  const leavesA: DecodedNode[] = [];
  const leavesB: DecodedNode[] = [];
  collectTerminals(rootA, leavesA);
  collectTerminals(rootB, leavesB);
  const pathsA = new Set(leavesA.map((leaf) => leaf.path));
  const byPathB = new Map(leavesB.map((leaf) => [leaf.path, leaf]));
  const allPaths = new Set(pathsA);
  for (const leaf of leavesB) allPaths.add(leaf.path);
  const changes: ElementChange[] = [];
  for (const la of leavesA) {
    const lb = byPathB.get(la.path);
    if (!lb) {
      changes.push({ label: la.path, status: 'removed', before: formatNode(la), after: '' });
      continue;
    }
    if (terminalEqual(la, lb)) continue;
    changes.push({
      label: la.path,
      status: 'changed',
      before: formatNode(la),
      after: formatNode(lb),
    });
  }
  for (const lb of leavesB) {
    if (pathsA.has(lb.path)) continue;
    changes.push({ label: lb.path, status: 'added', before: '', after: formatNode(lb) });
  }
  let total = allPaths.size;
  if (a.length > rootA.size || b.length > rootB.size) {
    total++;
    const tailA = a.subarray(rootA.size);
    const tailB = b.subarray(rootB.size);
    if (!valuesEqual(tailA, tailB)) {
      changes.push({
        label: '(trailing)',
        status: 'changed',
        before: formatBytes(tailA),
        after: formatBytes(tailB),
      });
    }
  }
  if (changes.length === 0) return null;
  return { changes, total };
}

export function elementChanges(
  type: DataType | null,
  hash: number,
  before: unknown,
  after: unknown,
): ArrayDiff | null {
  return (
    arrayElementChanges(type, before, after) ??
    structFieldChanges(hash, before, after) ??
    byteElementChanges(before, after)
  );
}
