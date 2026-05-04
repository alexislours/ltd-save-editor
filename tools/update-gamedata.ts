#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL =
  'https://raw.githubusercontent.com/tlmodding/ltd-gamedata/refs/heads/main/HashList/GameData.txt';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'static/GameData.txt');

const res = await fetch(SOURCE_URL);
if (!res.ok) {
  console.error(`fetch failed: HTTP ${res.status} ${res.statusText}`);
  process.exit(1);
}
const body = await res.text();
writeFileSync(OUT, body);
console.log(`wrote ${body.length} bytes -> static/GameData.txt`);
