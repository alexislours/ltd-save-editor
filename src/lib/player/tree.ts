import { arrayCount, isArrayType } from '../sav/codec';
import { DataType, DataTypeName } from '../sav/dataType';
import { nameForHash } from '../sav/knownKeys';
import type { Entry } from '../sav/types';

export type TreeNode = {
  segment: string;
  label: string;
  path: string;
  hash?: number;
  entry?: Entry;
  children: TreeNode[];
};

const UNKNOWN_ROOT = 'Unknown';

export function buildTree(entries: readonly Entry[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const byPath = new Map<string, TreeNode>();

  function folder(parent: TreeNode[], segment: string, path: string): TreeNode {
    const existing = byPath.get(path);
    if (existing) return existing;
    const node: TreeNode = { segment, label: segment, path, children: [] };
    byPath.set(path, node);
    parent.push(node);
    return node;
  }

  for (const entry of entries) {
    if (entry.type === DataType.Bool64bitKey && entry.payload == null) continue;

    const name = nameForHash(entry.hash);
    const dottedName = name ?? `${UNKNOWN_ROOT}.${formatHash(entry.hash)}`;
    const parts = dottedName.split('.');

    let level = roots;
    let pathAcc = '';
    let current: TreeNode | null = null;
    for (const part of parts) {
      pathAcc = pathAcc ? `${pathAcc}.${part}` : part;
      const node = folder(level, part, pathAcc);
      current = node;
      level = node.children;
    }

    if (current) {
      current.hash = entry.hash;
      current.entry = entry;
      current.label = `${current.segment} ${typeSuffix(entry)}`;
    }
  }

  const unknown = roots.find((n) => n.segment === UNKNOWN_ROOT);
  if (unknown) {
    unknown.label = `${UNKNOWN_ROOT} (${unknown.children.length})`;
  }
  sortTree(roots);
  return roots;
}

export function formatHash(hash: number): string {
  return '0x' + (hash >>> 0).toString(16).padStart(8, '0');
}

function typeSuffix(e: Entry): string {
  if (isArrayType(e.type)) {
    const count = e.payload ? arrayCount(e) : 0;
    return `(${DataTypeName[e.type]}[${count}])`;
  }
  return `(${DataTypeName[e.type]})`;
}

function sortTree(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    const af = a.children.length > 0 ? 0 : 1;
    const bf = b.children.length > 0 ? 0 : 1;
    if (af !== bf) return af - bf;
    return a.segment.localeCompare(b.segment, undefined, {
      sensitivity: 'base',
    });
  });
  for (const n of nodes) sortTree(n.children);
}
