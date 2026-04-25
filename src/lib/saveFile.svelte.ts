import { parseSav } from './sav/parse';
import { murmur3_x86_32 } from './sav/hash';

export type SaveKind = 'player' | 'mii' | 'map';

export type LoadedSave = {
  name: string;
  size: number;
  lastModified: number;
  bytes: Uint8Array;
};

export const expectedFileName: Record<SaveKind, string> = {
  player: 'Player.sav',
  mii: 'Mii.sav',
  map: 'Map.sav',
};

const SIGNATURE_HASHES: Record<SaveKind, number> = {
  player: murmur3_x86_32('Player.Name'),
  mii: murmur3_x86_32('Mii.Name.Name'),
  map: 0x78e32e1c,
};

export function detectSaveKindFromBytes(bytes: Uint8Array): SaveKind | null {
  let parsed;
  try {
    parsed = parseSav(bytes);
  } catch {
    return null;
  }
  const hashes = new Set(parsed.entries.map((e) => e.hash));
  for (const kind of Object.keys(SIGNATURE_HASHES) as SaveKind[]) {
    if (hashes.has(SIGNATURE_HASHES[kind])) return kind;
  }
  return null;
}

export function detectSaveKindFromName(fileName: string): SaveKind | null {
  const lower = fileName.toLowerCase();
  for (const kind of Object.keys(expectedFileName) as SaveKind[]) {
    if (lower === expectedFileName[kind].toLowerCase()) return kind;
  }
  return null;
}

const saves = $state<Record<SaveKind, LoadedSave | null>>({
  player: null,
  mii: null,
  map: null,
});

export function getSave(kind: SaveKind): LoadedSave | null {
  return saves[kind];
}

export async function setSaveFromFile(kind: SaveKind, file: File): Promise<void> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  saves[kind] = {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    bytes,
  };
}

export function clearSave(kind: SaveKind): void {
  saves[kind] = null;
}
