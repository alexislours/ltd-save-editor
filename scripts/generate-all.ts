import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const GENERATORS = [
  'generate-actor-names.ts',
  'generate-food-data.ts',
  'generate-cloth-data.ts',
  'generate-coordinate-data.ts',
  'generate-treasure-data.ts',
  'generate-roomstyle-data.ts',
  'generate-item-data.ts',
  'generate-trouble-data.ts',
  'generate-habit-data.ts',
  'generate-wish-data.ts',
  'generate-mii-labels.ts',
  'generate-word-kind-labels.ts',
];

for (const name of GENERATORS) {
  const path = resolve(HERE, 'generators', name);
  console.log(`\n=== ${name} ===`);
  const r = spawnSync(process.execPath, [path], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`[generate-all] ${name} failed (exit ${r.status})`);
    process.exit(1);
  }
}

console.log(`\n[generate-all] ${GENERATORS.length} generators ran successfully.`);
