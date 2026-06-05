import { bitfield, bytes, type StructDef } from '../types';

const GIVEN_UGC_FLAG_FLAGS = bitfield({
  name: 'GivenUgcFlagBits',
  members: Array.from({ length: 100 }, (_, slot) => ({
    name: `UgcFood_${slot.toString().padStart(2, '0')}`,
    bits: 1,
  })),
});

export const GIVEN_UGC_FLAG: StructDef = {
  name: 'GivenUgcFlag',
  fields: [
    { name: 'flags', type: GIVEN_UGC_FLAG_FLAGS },
    { name: 'reserved', type: bytes(3) },
  ],
};
