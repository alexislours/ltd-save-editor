import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GAME_DATA = resolve(ROOT, 'game-data');
const RAW = resolve(GAME_DATA, 'romfs-raw');
const ROMFS = resolve(GAME_DATA, 'romfs');

rmSync(RAW, { recursive: true, force: true });
rmSync(ROMFS, { recursive: true, force: true });

execFileSync(
  'tomo',
  [
    'nsp',
    'romfs',
    '--out',
    RAW,
    '-u',
    resolve(GAME_DATA, 'tomodachi_life_1.0.2.nsp'),
    '-k',
    resolve(GAME_DATA, 'prod.keys'),
    resolve(GAME_DATA, 'tomodachi_life_base.nsp'),
  ],
  { stdio: 'inherit' },
);

execFileSync(
  'tomo',
  ['romfs', 'extract', '--convert', '--only', 'byml,msbt,msbp,bntx', '--out', ROMFS, RAW],
  { stdio: 'inherit' },
);

rmSync(RAW, { recursive: true, force: true });
