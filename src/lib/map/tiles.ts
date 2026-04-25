export type TileDef = {
  hash: number;
  code: string;
  color: string;
  internal?: boolean;
};

export const TILE_DEFS: readonly TileDef[] = [
  { hash: 0x5e52f4de, code: 'Archstone', color: '#e0dfdc' },
  { hash: 0x91dfa1ea, code: 'Archstone_Road', color: '#d6d5d2' },
  { hash: 0xd7e5e4e0, code: 'Asphalt', color: '#393c40' },
  { hash: 0xde578684, code: 'Asphalt_Road', color: '#303236' },
  { hash: 0xb6d76a62, code: 'Beach', color: '#F2D8A3' },
  { hash: 0x54ae7e98, code: 'CherryBlossom', color: '#e0c5d3' },
  { hash: 0xd1b37f49, code: 'CherryBlossom_Road', color: '#c9b1be' },
  { hash: 0xa27341ed, code: 'Clover', color: '#7D943C' },
  { hash: 0xafa5b5ab, code: 'Clover_Road', color: '#708535' },
  { hash: 0xb019eff9, code: 'Cobblestone', color: '#B7C2C4' },
  { hash: 0xa442959e, code: 'Cobblestone_Road', color: '#A9B6B8' },
  { hash: 0xcf83cf1f, code: 'Concrete', color: '#A1A1A1' },
  { hash: 0x318904d8, code: 'Concrete_Road', color: '#4F4F4F' },
  { hash: 0x8a58eb7d, code: 'FallenLeaves', color: '#E07B28' },
  { hash: 0x923cfbd7, code: 'FallenLeaves_Road', color: '#CC6B1D' },
  { hash: 0x3948dc33, code: 'Gold', color: '#E8C341' },
  { hash: 0x8698c8b7, code: 'Gold_Road', color: '#E8AE41' },
  { hash: 0xff4ae68a, code: 'Grass', color: '#62733B' },
  { hash: 0x2ef21057, code: 'Grass_Road', color: '#515E2D' },
  { hash: 0x1fb9379d, code: 'Iron', color: '#CACDCF' },
  { hash: 0x8b39f8d2, code: 'Iron_Road', color: '#B8BCBF' },
  { hash: 0xa4afd856, code: 'Pebble', color: '#B8A681' },
  { hash: 0xca11e25a, code: 'Pebble_Road', color: '#997151' },
  { hash: 0x122a7d23, code: 'Sand', color: '#C9A05D' },
  { hash: 0x2b9b8582, code: 'Sand_Road', color: '#B58D4C' },
  { hash: 0x47f627bd, code: 'Snow', color: '#E6EDEC' },
  { hash: 0xe9473287, code: 'Snow_Road', color: '#D3DEDD' },
  { hash: 0x9999d173, code: 'Soil', color: '#C68B46' },
  { hash: 0x62f90493, code: 'Soil_Road', color: '#B07A3C' },
  { hash: 0x10f7ee55, code: 'Stone', color: '#C97038' },
  { hash: 0xc67a3c6c, code: 'Stone_Road', color: '#B35E2B' },
  { hash: 0xa155274b, code: 'Tile', color: '#25A0C2' },
  { hash: 0xa281db34, code: 'Tile_Road', color: '#1E90B0' },
  { hash: 0xd21b65b6, code: 'Water', color: '#3A6A85' },
  { hash: 0xeb213538, code: 'Wood', color: '#966120' },
  { hash: 0x5e35b65f, code: 'Wood_Road', color: '#7A4C14' },
  { hash: 0xb53f5f3d, code: 'Seaside', color: '#6A9B7A', internal: true },
  { hash: 0x17ee09e8, code: 'RoomInvalid', color: '#FF00FF', internal: true },
  { hash: 0x69fff2f1, code: 'UGC', color: '#ED2424', internal: true },
];

export const UNKNOWN_TILE_COLOR = '#FF00FF';

const TILE_BY_HASH: ReadonlyMap<number, TileDef> = new Map(TILE_DEFS.map((t) => [t.hash >>> 0, t]));

export function tileDefForHash(hash: number): TileDef | null {
  return TILE_BY_HASH.get(hash >>> 0) ?? null;
}

export function tileColorForHash(hash: number): string {
  return tileDefForHash(hash)?.color ?? UNKNOWN_TILE_COLOR;
}

export type TileTranslator = (key: string) => string;

export function tileLabelForHash(hash: number, t: TileTranslator): string {
  const def = tileDefForHash(hash);
  if (!def) return `0x${(hash >>> 0).toString(16).padStart(8, '0')}`;
  return t(`map.tile.${def.code}`);
}

export function packColorRGBA(color: string): number {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
