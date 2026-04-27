import { describe, expect, it } from 'vitest';
import { hexU32, parseMaybeHex, safe } from './format';

describe('hexU32', () => {
  it('formats zero as 8 zero digits with 0x prefix', () => {
    expect(hexU32(0)).toBe('0x00000000');
  });

  it('zero-pads small values to 8 digits', () => {
    expect(hexU32(1)).toBe('0x00000001');
    expect(hexU32(0xab)).toBe('0x000000ab');
  });

  it('formats max u32', () => {
    expect(hexU32(0xffffffff)).toBe('0xffffffff');
  });

  it('treats negative ints as their two-complement u32 form', () => {
    expect(hexU32(-1)).toBe('0xffffffff');
    expect(hexU32(-2)).toBe('0xfffffffe');
  });
});

describe('parseMaybeHex', () => {
  it('parses decimal strings', () => {
    expect(parseMaybeHex('42')).toBe(42);
    expect(parseMaybeHex('0')).toBe(0);
  });

  it('parses 0x-prefixed hex strings (case-insensitive)', () => {
    expect(parseMaybeHex('0xff')).toBe(255);
    expect(parseMaybeHex('0XFF')).toBe(255);
    expect(parseMaybeHex('0xDeAdBeEf')).toBe(0xdeadbeef);
  });

  it('trims surrounding whitespace before parsing', () => {
    expect(parseMaybeHex('  100  ')).toBe(100);
    expect(parseMaybeHex(' 0x10 ')).toBe(16);
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(parseMaybeHex('')).toBeNull();
    expect(parseMaybeHex('   ')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseMaybeHex('not a number')).toBeNull();
    expect(parseMaybeHex('0xZZ')).toBeNull();
  });
});

describe('safe', () => {
  it('returns the function result on success', () => {
    expect(safe(() => 7, 0)).toBe(7);
  });

  it('returns the fallback when the function throws', () => {
    expect(
      safe(() => {
        throw new Error('boom');
      }, 'fallback'),
    ).toBe('fallback');
  });

  it('preserves the result type', () => {
    const value: number = safe(() => 1 + 1, -1);
    expect(value).toBe(2);
  });
});
