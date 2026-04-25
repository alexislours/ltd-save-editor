export type TileDef = {
  hash: number;
  code: string;
  label: string;
  color: string;
  internal?: boolean;
};

export const TILE_DEFS: readonly TileDef[] = [
  {
    hash: 0x5e52f4de,
    code: 'Archstone',
    label: 'Arched cobblestone',
    color: '#e0dfdc',
  },
  {
    hash: 0x91dfa1ea,
    code: 'Archstone_Road',
    label: 'Arched-cobblestone path',
    color: '#d6d5d2',
  },
  { hash: 0xd7e5e4e0, code: 'Asphalt', label: 'Asphalt', color: '#393c40' },
  {
    hash: 0xde578684,
    code: 'Asphalt_Road',
    label: 'Asphalt path',
    color: '#303236',
  },
  { hash: 0xb6d76a62, code: 'Beach', label: 'Sandy beach', color: '#F2D8A3' },
  {
    hash: 0x54ae7e98,
    code: 'CherryBlossom',
    label: 'Cherry blossoms',
    color: '#e0c5d3',
  },
  {
    hash: 0xd1b37f49,
    code: 'CherryBlossom_Road',
    label: 'Cherry-blossoms path',
    color: '#c9b1be',
  },
  { hash: 0xa27341ed, code: 'Clover', label: 'Clovers', color: '#7D943C' },
  {
    hash: 0xafa5b5ab,
    code: 'Clover_Road',
    label: 'Clover path',
    color: '#708535',
  },
  {
    hash: 0xb019eff9,
    code: 'Cobblestone',
    label: 'Cobblestone',
    color: '#B7C2C4',
  },
  {
    hash: 0xa442959e,
    code: 'Cobblestone_Road',
    label: 'Cobblestone path',
    color: '#A9B6B8',
  },
  { hash: 0xcf83cf1f, code: 'Concrete', label: 'Concrete', color: '#A1A1A1' },
  {
    hash: 0x318904d8,
    code: 'Concrete_Road',
    label: 'Concrete path',
    color: '#4F4F4F',
  },
  {
    hash: 0x8a58eb7d,
    code: 'FallenLeaves',
    label: 'Fallen leaves',
    color: '#E07B28',
  },
  {
    hash: 0x923cfbd7,
    code: 'FallenLeaves_Road',
    label: 'Fallen-leaves path',
    color: '#CC6B1D',
  },
  { hash: 0x3948dc33, code: 'Gold', label: 'Gold tiles', color: '#E8C341' },
  {
    hash: 0x8698c8b7,
    code: 'Gold_Road',
    label: 'Gold-tile path',
    color: '#E8AE41',
  },
  { hash: 0xff4ae68a, code: 'Grass', label: 'Grass', color: '#62733B' },
  {
    hash: 0x2ef21057,
    code: 'Grass_Road',
    label: 'Grass path',
    color: '#515E2D',
  },
  { hash: 0x1fb9379d, code: 'Iron', label: 'Steel plate', color: '#CACDCF' },
  {
    hash: 0x8b39f8d2,
    code: 'Iron_Road',
    label: 'Steel-plate path',
    color: '#B8BCBF',
  },
  { hash: 0xa4afd856, code: 'Pebble', label: 'Gravel', color: '#B8A681' },
  {
    hash: 0xca11e25a,
    code: 'Pebble_Road',
    label: 'Gravel path',
    color: '#997151',
  },
  { hash: 0x122a7d23, code: 'Sand', label: 'Sand', color: '#C9A05D' },
  { hash: 0x2b9b8582, code: 'Sand_Road', label: 'Sand path', color: '#B58D4C' },
  { hash: 0x47f627bd, code: 'Snow', label: 'Snow', color: '#E6EDEC' },
  { hash: 0xe9473287, code: 'Snow_Road', label: 'Snow path', color: '#D3DEDD' },
  { hash: 0x9999d173, code: 'Soil', label: 'Dirt', color: '#C68B46' },
  { hash: 0x62f90493, code: 'Soil_Road', label: 'Dirt path', color: '#B07A3C' },
  { hash: 0x10f7ee55, code: 'Stone', label: 'Bricks', color: '#C97038' },
  {
    hash: 0xc67a3c6c,
    code: 'Stone_Road',
    label: 'Brick path',
    color: '#B35E2B',
  },
  { hash: 0xa155274b, code: 'Tile', label: 'Tiles', color: '#25A0C2' },
  { hash: 0xa281db34, code: 'Tile_Road', label: 'Tile path', color: '#1E90B0' },
  { hash: 0xd21b65b6, code: 'Water', label: 'Sea', color: '#3A6A85' },
  { hash: 0xeb213538, code: 'Wood', label: 'Wooden boards', color: '#966120' },
  {
    hash: 0x5e35b65f,
    code: 'Wood_Road',
    label: 'Wooden-boards path',
    color: '#7A4C14',
  },
  {
    hash: 0xb53f5f3d,
    code: 'Seaside',
    label: 'Seaside',
    color: '#6A9B7A',
    internal: true,
  },
  {
    hash: 0x17ee09e8,
    code: 'RoomInvalid',
    label: 'Room (invalid)',
    color: '#FF00FF',
    internal: true,
  },
  {
    hash: 0x69fff2f1,
    code: 'UGC',
    label: 'UGC floor',
    color: '#ED2424',
    internal: true,
  },
];

export const UNKNOWN_TILE_COLOR = '#FF00FF';

const TILE_BY_HASH: ReadonlyMap<number, TileDef> = new Map(TILE_DEFS.map((t) => [t.hash >>> 0, t]));

export function tileDefForHash(hash: number): TileDef | null {
  return TILE_BY_HASH.get(hash >>> 0) ?? null;
}

export function tileColorForHash(hash: number): string {
  return tileDefForHash(hash)?.color ?? UNKNOWN_TILE_COLOR;
}

export function tileLabelForHash(hash: number): string {
  return tileDefForHash(hash)?.label ?? `0x${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function packColorRGBA(color: string): number {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
