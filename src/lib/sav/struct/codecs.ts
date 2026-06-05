import type { Codec, CodecValue } from './types';

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function toUtcInput(ms: number): string {
  const d = new Date(ms);
  return (
    `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}` +
    `T${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}:${pad(d.getUTCSeconds(), 2)}`
  );
}

function fromUtcInput(text: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
}

const durationFmt = new Intl.DurationFormat(undefined, { style: 'narrow' });

function fmtDurationMs(totalMs: number): string {
  const neg = totalMs < 0;
  let ms = Math.abs(Math.trunc(totalMs));
  const days = Math.floor(ms / 86400000);
  ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000);
  ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000);
  ms -= minutes * 60000;
  const seconds = Math.floor(ms / 1000);
  ms -= seconds * 1000;
  const text = durationFmt.format({ days, hours, minutes, seconds, milliseconds: ms });
  return (neg ? '-' : '') + (text || '0s');
}

function asPrev(value: number, prev: CodecValue): CodecValue {
  return typeof prev === 'bigint' ? BigInt(Math.round(value)) : value;
}

function makeEpoch(unitMs: number, id: string, label: string): Codec {
  return {
    id,
    label,
    input: 'datetime-local',
    display(value) {
      const n = typeof value === 'bigint' ? value : BigInt(Math.trunc(value));
      if (n === 0n) return '';
      const ms = Number(n) * unitMs;
      if (!Number.isFinite(ms)) return '';
      return toUtcInput(ms);
    },
    parse(text, prev) {
      if (text.trim() === '') return typeof prev === 'bigint' ? 0n : 0;
      const ms = fromUtcInput(text);
      if (ms === null || ms < 0) return null;
      return asPrev(ms / unitMs, prev);
    },
  };
}

function makeDuration(unitMs: number, id: string, label: string): Codec {
  return {
    id,
    label,
    input: 'readonly',
    display(value) {
      const n = typeof value === 'bigint' ? Number(value) : value;
      return fmtDurationMs(n * unitMs);
    },
  };
}

export const epochSeconds = makeEpoch(1000, 'epoch-s', 'Unix time (s)');
export const durationSeconds = makeDuration(1000, 'dur-s', 'Duration (s)');
