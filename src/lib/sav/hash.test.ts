import { describe, expect, it } from 'vitest';
import { murmur3_x86_32, murmur3_x86_32_bytes } from './hash';

describe('murmur3_x86_32', () => {
  it.each([
    { input: '', seed: 0, expected: 0x00000000 },
    { input: '', seed: 1, expected: 0x514e28b7 },
    { input: '', seed: 0xffffffff, expected: 0x81f16f39 },
    { input: 'a', seed: 0x9747b28c, expected: 0x7fa09ea6 },
    { input: 'ab', seed: 0x9747b28c, expected: 0x74875592 },
    { input: 'abc', seed: 0x9747b28c, expected: 0xc84a62dd },
    { input: 'abcd', seed: 0x9747b28c, expected: 0xf0478627 },
    { input: 'aa', seed: 0x9747b28c, expected: 0x5d211726 },
    { input: 'aaa', seed: 0x9747b28c, expected: 0x283e0130 },
    { input: 'aaaa', seed: 0x9747b28c, expected: 0x5a97808a },
    { input: 'Hello, world!', seed: 0x9747b28c, expected: 0x24884cba },
  ])('matches reference vector for "$input" (seed 0x$seed)', ({ input, seed, expected }) => {
    expect(murmur3_x86_32(input, seed)).toBe(expected);
  });

  it('returns unsigned 32-bit values', () => {
    const h = murmur3_x86_32('any string', 0);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });

  it('produces the same result for identical inputs (deterministic)', () => {
    expect(murmur3_x86_32('Tomodachi Life', 42)).toBe(murmur3_x86_32('Tomodachi Life', 42));
  });

  it('differs for different seeds', () => {
    expect(murmur3_x86_32('same', 0)).not.toBe(murmur3_x86_32('same', 1));
  });

  it('handles UTF-8 multi-byte characters via TextEncoder', () => {
    const expected = murmur3_x86_32_bytes(new TextEncoder().encode('日本語'), 0);
    expect(murmur3_x86_32('日本語', 0)).toBe(expected);
  });
});

describe('murmur3_x86_32_bytes', () => {
  it('agrees with the string overload for ASCII input', () => {
    const s = 'PLAYER_NAME_HASH';
    const bytes = new TextEncoder().encode(s);
    expect(murmur3_x86_32_bytes(bytes, 0)).toBe(murmur3_x86_32(s, 0));
  });

  it('processes tail bytes correctly across all length residues mod 4', () => {
    const seed = 0x9747b28c;
    const inputs = ['a', 'ab', 'abc', 'abcd', 'abcde', 'abcdef', 'abcdefg', 'abcdefgh'];
    const hashes = inputs.map((s) => murmur3_x86_32(s, seed));
    expect(new Set(hashes).size).toBe(inputs.length);
  });
});
