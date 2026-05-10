import { writeFileSync } from 'node:fs';

export function writeMinifiedJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value) + '\n', 'utf8');
}

export function writePrettyJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function compareCaseInsensitive(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}
