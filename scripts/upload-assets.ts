import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BUCKET = 'ltd-save-editor-assets';
const TARBALL = 'icons.tar.zst';
const STATIC_DIR = resolve('static');
const HASH_FILE = resolve('scripts/icons.sha256');

const ICON_DIRS = readdirSync(STATIC_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.endsWith('-icons'))
  .map((e) => e.name)
  .sort();

if (ICON_DIRS.length === 0) {
  console.error(`[upload-assets] No *-icons directories found in static/.`);
  console.error(`[upload-assets] Run "npm run data:generate" first.`);
  process.exit(1);
}

const TAR_FORMAT = process.platform === 'darwin' ? 'gnutar' : 'gnu';

console.log(`[upload-assets] Packing ${ICON_DIRS.length} directories...`);
const tar = spawnSync(
  'tar',
  ['--format', TAR_FORMAT, '--zstd', '-cf', TARBALL, '-C', STATIC_DIR, ...ICON_DIRS],
  { stdio: 'inherit' },
);
if (tar.status !== 0) {
  console.error(`[upload-assets] tar failed (exit ${tar.status})`);
  process.exit(1);
}

const hash = createHash('sha256').update(readFileSync(TARBALL)).digest('hex').slice(0, 12);
const objectKey = `icons-${hash}.tar.zst`;
const sizeMb = (statSync(TARBALL).size / 1024 / 1024).toFixed(2);
console.log(
  `[upload-assets] Tarball is ${sizeMb} MB, hash ${hash}. Uploading to r2://${BUCKET}/${objectKey}...`,
);

const upload = spawnSync(
  'npx',
  ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${objectKey}`, `--file=${TARBALL}`, '--remote'],
  { stdio: 'inherit' },
);
const uploadStatus = upload.status;

rmSync(TARBALL, { force: true });

if (uploadStatus !== 0) {
  console.error(`[upload-assets] wrangler upload failed (exit ${uploadStatus})`);
  process.exit(1);
}

writeFileSync(HASH_FILE, `${hash}\n`);
console.log(`[upload-assets] Wrote ${HASH_FILE}. Commit this file so CI picks up the new icons.`);
