import { describe, expect, it } from 'vitest';
import { deepMerge, flatten, pickPath, sliceKeys, validateAliases, wrapAtPath } from './i18n-types';

describe('flatten', () => {
  it('produces dotted paths for nested leaves', () => {
    expect(flatten({ a: { b: { c: 'x' }, d: 'y' }, e: 'z' })).toEqual(['a.b.c', 'a.d', 'e']);
  });

  it('treats arrays as leaves', () => {
    expect(flatten({ a: ['one', 'two'], b: { c: [1, 2] } })).toEqual(['a', 'b.c']);
  });

  it('returns empty for empty objects', () => {
    expect(flatten({})).toEqual([]);
  });
});

describe('pickPath', () => {
  const root = { a: { b: { c: 'leaf' } }, list: ['x'] };

  it('descends to leaves', () => {
    expect(pickPath(root, 'a.b.c')).toBe('leaf');
  });

  it('throws on missing intermediate', () => {
    expect(() => pickPath(root, 'a.x.c')).toThrow(/missing x/);
  });

  it('throws on missing leaf', () => {
    expect(() => pickPath(root, 'a.b.d')).toThrow(/missing d/);
  });

  it('throws when descending into a non-object', () => {
    expect(() => pickPath(root, 'a.b.c.d')).toThrow(/cannot descend into d/);
  });

  it('throws when descending into an array', () => {
    expect(() => pickPath(root, 'list.x')).toThrow(/cannot descend into x/);
  });
});

describe('wrapAtPath', () => {
  it('wraps a value at a single segment', () => {
    expect(wrapAtPath('a', 'v')).toEqual({ a: 'v' });
  });

  it('wraps a value at a nested path', () => {
    expect(wrapAtPath('a.b.c', 'v')).toEqual({ a: { b: { c: 'v' } } });
  });

  it('preserves nested object values', () => {
    expect(wrapAtPath('a.b', { c: 'v' })).toEqual({ a: { b: { c: 'v' } } });
  });
});

describe('deepMerge', () => {
  it('merges nested objects', () => {
    const t: Record<string, unknown> = { a: { b: 1, c: 2 } };
    deepMerge(t, { a: { c: 3, d: 4 } });
    expect(t).toEqual({ a: { b: 1, c: 3, d: 4 } });
  });

  it('overwrites primitives', () => {
    const t: Record<string, unknown> = { a: 'old' };
    deepMerge(t, { a: 'new' });
    expect(t).toEqual({ a: 'new' });
  });

  it('overwrites arrays rather than merging', () => {
    const t: Record<string, unknown> = { a: [1, 2] };
    deepMerge(t, { a: [3] });
    expect(t).toEqual({ a: [3] });
  });
});

describe('sliceKeys', () => {
  const root = {
    app: { title: 'T' },
    mii: { name: 'N', section: { hint: 'H' } },
    map: { tile: 'M' },
  };

  it('returns keys for a single path', () => {
    expect(sliceKeys(root, ['mii']).sort()).toEqual(['mii.name', 'mii.section.hint']);
  });

  it('merges keys from multiple paths', () => {
    expect(sliceKeys(root, ['app', 'map']).sort()).toEqual(['app.title', 'map.tile']);
  });

  it('throws when a path is missing', () => {
    expect(() => sliceKeys(root, ['nope'])).toThrow(/missing nope/);
  });
});

describe('validateAliases', () => {
  it('passes when targets exist and alias does not collide', () => {
    expect(() => validateAliases({ 'fr-US': 'fr-EU' }, ['en-US', 'fr-EU'])).not.toThrow();
  });

  it('throws when target locale is missing', () => {
    expect(() => validateAliases({ 'fr-US': 'fr-EU' }, ['en-US'])).toThrow(
      /target locale not found/,
    );
  });

  it('throws when alias collides with a real locale', () => {
    expect(() => validateAliases({ 'en-US': 'en-US' }, ['en-US'])).toThrow(/conflicts/);
  });
});
