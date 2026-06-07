import { describe, expect, it } from 'vitest';
import { durationSeconds, epochSeconds } from './codecs.js';

describe('epochSeconds', () => {
  it('round-trips a UTC datetime to seconds', () => {
    const seconds = 1_700_000_000n;
    const text = epochSeconds.display(seconds);
    expect(epochSeconds.parse?.(text, seconds)).toBe(seconds);
  });

  it('displays empty for zero', () => {
    expect(epochSeconds.display(0n)).toBe('');
  });

  it('parses empty back to zero', () => {
    expect(epochSeconds.parse?.('', 0n)).toBe(0n);
  });

  it('rejects pre-1970 dates instead of producing negative seconds', () => {
    expect(epochSeconds.parse?.('1969-12-31T23:59:59', 0n)).toBeNull();
  });

  it('rejects unparseable text', () => {
    expect(epochSeconds.parse?.('not a date', 0n)).toBeNull();
  });
});

describe('durationSeconds', () => {
  it('is read-only', () => {
    expect(durationSeconds.input).toBe('readonly');
    expect(durationSeconds.parse).toBeUndefined();
  });

  it('formats a span across units', () => {
    const oneDayOneHour = BigInt(86400 + 3600);
    expect(durationSeconds.display(oneDayOneHour)).toContain('1');
  });
});
