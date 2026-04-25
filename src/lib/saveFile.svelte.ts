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
