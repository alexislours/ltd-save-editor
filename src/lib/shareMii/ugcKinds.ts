export type UgcKind =
  | 'Food'
  | 'Cloth'
  | 'Goods'
  | 'Interior'
  | 'Exterior'
  | 'MapObject'
  | 'MapFloor';

export const UGC_KINDS: readonly UgcKind[] = [
  'Food',
  'Cloth',
  'Goods',
  'Interior',
  'Exterior',
  'MapObject',
  'MapFloor',
];

export const UGC_DISPLAY_LABELS: Record<UgcKind, string> = {
  Food: 'Food',
  Cloth: 'Clothing',
  Goods: 'Treasure',
  Interior: 'Interior',
  Exterior: 'Exterior',
  MapObject: 'Objects',
  MapFloor: 'Landscaping',
};

export const UGC_FILE_EXTENSIONS: Record<UgcKind, string> = {
  Food: '.ltdf',
  Cloth: '.ltdc',
  Goods: '.ltdg',
  Interior: '.ltdi',
  Exterior: '.ltde',
  MapObject: '.ltdo',
  MapFloor: '.ltdl',
};

export function ugcKindIndex(kind: UgcKind): number {
  return UGC_KINDS.indexOf(kind);
}

export function ugcKindFromIndex(i: number): UgcKind {
  const kind = UGC_KINDS[i];
  if (!kind) throw new Error(`Invalid UGC kind index: ${i}`);
  return kind;
}

export const UGC_MAX_SLOTS: Record<UgcKind, number> = {
  Food: 99,
  Cloth: 299,
  Goods: 99,
  Interior: 99,
  Exterior: 99,
  MapObject: 99,
  MapFloor: 99,
};

export function ugcFileBase(kind: UgcKind, slot: number): string {
  return `Ugc${kind}${String(slot).padStart(3, '0')}`;
}

export function ugcCanvasFileName(kind: UgcKind, slot: number): string {
  return `${ugcFileBase(kind, slot)}.canvas.zs`;
}

export function ugcTexFileName(kind: UgcKind, slot: number): string {
  return `${ugcFileBase(kind, slot)}.ugctex.zs`;
}

export function ugcThumbFileName(kind: UgcKind, slot: number): string {
  return `${ugcFileBase(kind, slot)}_Thumb.ugctex.zs`;
}

export function facepaintFileBase(id: number): string {
  return `UgcFacePaint${String(id).padStart(3, '0')}`;
}

export function facepaintCanvasFileName(id: number): string {
  return `${facepaintFileBase(id)}.canvas.zs`;
}

export function facepaintTexFileName(id: number): string {
  return `${facepaintFileBase(id)}.ugctex.zs`;
}

export type UgcFieldHashes = {
  fields: readonly number[];
  names: readonly number[];
  vector?: number;
  vector2?: number;
};

export const UGC_HASHES: Record<UgcKind, UgcFieldHashes> = {
  Food: {
    fields: [
      0x307feefa, 0x6f93ffbd, 0x5ca9336e, 0xf768620a, 0x5af04beb, 0x2db168c5, 0x634800ae,
      0xdd8d6c5a, 0xaf1186cf, 0x58e6aad3,
    ],
    names: [0x408494f5, 0xba0f4baf],
  },
  Cloth: {
    fields: [
      0xc81545fe, 0x2fb9146d, 0x7a31ef97, 0x7eec35e9, 0x5e32fd3f, 0x0dbabe27, 0x71621c98,
      0x2d271339, 0xcdf31eb5, 0x2823dbd3,
    ],
    names: [0x40710642, 0xcf9a13ea],
  },
  Goods: {
    fields: [
      0x3faa2222, 0x823f8297, 0x7ecc8a60, 0x88dc1d43, 0x8896ddd6, 0xbff29472, 0x5d965762,
      0x78d39208, 0x53c762b0, 0x40d2c6fe, 0xc0a6c046, 0xae373b0d, 0x7d5ffbb7, 0x9e978f5e,
      0xf6349929, 0x9038cdd0, 0x9a59f58a,
    ],
    names: [0x2f793eb1, 0xf655b33a, 0xf36a5a0b, 0xa66367eb],
    vector: 0xf36c4e28,
  },
  Interior: {
    fields: [
      0xa9116402, 0x835114c1, 0xec65e2e4, 0x0a7cf2c5, 0x662cd807, 0x01b3661e, 0x5af4a09f,
      0x41ff2201,
    ],
    names: [0x3de2c5dd, 0x85a37b90],
  },
  Exterior: {
    fields: [
      0xed95cf0f, 0x43f509ba, 0xa7a0773c, 0xa7a0773c, 0x34ba6119, 0x5e6e9f8c, 0x2907c040,
      0x97865d6b, 0x609f197d, 0x47a50525, 0x71ea7734,
    ],
    names: [0x27c875d6, 0x0e15e3f8],
    vector: 0x3c14025e,
    vector2: 0xb9d21b4f,
  },
  MapObject: {
    fields: [
      0x274659d1, 0xdce826fc, 0xe04e1e6b, 0x056f2f20, 0xbc7d7e30, 0x3c2bc52f, 0xcffeccc2,
      0x5c15e339, 0x5eff5e0e, 0x9838264b, 0x48778de6, 0x62ad5137, 0xd1b3b197,
    ],
    names: [0x56f99338, 0xee921ae2],
    vector: 0x27f2ecde,
    vector2: 0x2f96203b,
  },
  MapFloor: {
    fields: [
      0x21d582d9, 0xde7cb924, 0xe8bd8c89, 0xc35b8b0f, 0x60e280fb, 0x7ec3836a, 0xf209e2f9,
      0x6d842acc,
    ],
    names: [0x918875a9, 0x503490e0],
  },
};

export const UGC_ENABLE_HASHES: Record<UgcKind, number> = {
  Food: 0xf4a39965,
  Cloth: 0xaf129c33,
  Goods: 0x1a9c00fe,
  Interior: 0xa39744e9,
  Exterior: 0xf4beadc2,
  MapObject: 0x5951050b,
  MapFloor: 0xa1126d32,
};

export const UGC_TEXTURE_HASHES: Record<UgcKind, number> = {
  Food: 0x3558b77f,
  Cloth: 0x59bfa9d3,
  Goods: 0x70d10a48,
  Interior: 0xe7f9d439,
  Exterior: 0x16227c50,
  MapObject: 0xa9c5cfb8,
  MapFloor: 0x06a7a14c,
};

export const UGC_HASH_ID_HASHES: Record<UgcKind, number> = {
  Food: 0x6d48f8e2,
  Cloth: 0x89f25cac,
  Goods: 0x56202100,
  Interior: 0x7fef7f7d,
  Exterior: 0x38d72795,
  MapObject: 0x1b28b170,
  MapFloor: 0x816d50a3,
};

export const UGC_TEX_DATA = new Uint8Array([
  0x41, 0x49, 0x93, 0x56, 0xe3, 0xc2, 0x2f, 0xb4, 0x41, 0x49, 0x93, 0x56, 0xe3, 0xc2, 0x2f, 0xb4,
  0xe3, 0xc2, 0x2f, 0xb4, 0xe3, 0xc2, 0x2f, 0xb4, 0xe3, 0xc2, 0x2f, 0xb4,
]);

export const UGC_HASH_INDICES: Record<UgcKind, number> = {
  Food: 1,
  Cloth: 3,
  Goods: 2,
  Interior: 6,
  Exterior: 7,
  MapObject: 4,
  MapFloor: 5,
};

export const FACEPAINT_HASHES = {
  price: 0x4c9819e4,
  textureSourceType: 0xdecc8954,
  state: 0x23135bc5,
  unknown: 0xffc750b6,
  hash: 0xa56e42ec,
};

export const MII_HASHES = {
  facePaintIndex: 0x5e32adf4,
  tempSlotMii: 0x114eff89,
  names: 0x2499bfda,
  pronunciation: 0x3a5eda05,
  rawMii: 0x881ca27a,
  isLoveGender: 0xdfc82223,
  personality: [
    0x43cd364f, 0xcd8dbaf8, 0x25b48224, 0x607ba160, 0x68e1134e, 0x4913ae1a, 0x141ee086, 0x07b9d175,
    0x81cf470a, 0x4d78e262, 0xfbc3ffb0, 0x236e2d73, 0xf3c3de59, 0x660c5247, 0x5d7d3f45, 0xab8ae08b,
    0x2545e583, 0x6cf484f4,
  ] as const,
};

export const UGC_NAME_HASHES: Record<UgcKind, number> = {
  Food: 0x408494f5,
  Cloth: 0x40710642,
  Goods: 0x2f793eb1,
  Interior: 0x3de2c5dd,
  Exterior: 0x27c875d6,
  MapObject: 0x56f99338,
  MapFloor: 0x918875a9,
};
