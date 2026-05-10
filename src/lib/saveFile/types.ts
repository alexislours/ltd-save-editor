export type SaveKind = 'player' | 'mii' | 'map';

export const SAVE_KINDS: readonly SaveKind[] = ['player', 'mii', 'map'];

export const expectedFileName: Record<SaveKind, string> = {
  player: 'Player.sav',
  mii: 'Mii.sav',
  map: 'Map.sav',
};
