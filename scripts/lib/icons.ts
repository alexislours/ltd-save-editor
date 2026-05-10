import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

export type IconConvertResult = { converted: number; missing: number };

export type IconJob = {
  src: string;
  dst: string;
  label?: string;
  skipIfExists?: boolean;
};

export type ConvertOptions = {
  warnMissing?: boolean;
  warnFailure?: boolean;
};

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function convertWebp(
  jobs: Iterable<IconJob>,
  options: ConvertOptions = {},
): IconConvertResult {
  const warnMissing = options.warnMissing ?? true;
  const warnFailure = options.warnFailure ?? true;

  const valid: IconJob[] = [];
  let missing = 0;
  for (const job of jobs) {
    if (!existsSync(job.src)) {
      missing++;
      if (warnMissing) {
        const label = job.label ? ` (${job.label})` : '';
        console.warn(`[icon] ${basename(job.src)} missing${label}`);
      }
      continue;
    }
    if (job.skipIfExists && existsSync(job.dst)) continue;
    valid.push(job);
  }

  if (valid.length === 0) return { converted: 0, missing };

  const byDstDir = new Map<string, IconJob[]>();
  for (const job of valid) {
    const dir = dirname(job.dst);
    let arr = byDstDir.get(dir);
    if (!arr) {
      arr = [];
      byDstDir.set(dir, arr);
    }
    arr.push(job);
  }

  let converted = 0;
  for (const [dstDir, group] of byDstDir) {
    const scratch = mkdtempSync(join(tmpdir(), 'icon-conv-'));
    try {
      for (const job of group) {
        const dstBase = basename(job.dst, '.webp');
        symlinkSync(job.src, join(scratch, `${dstBase}.png`));
      }
      const r = spawnSync(
        'sh',
        [
          '-c',
          `find "$1" -name '*.png' -print0 | xargs -0 magick mogrify -path "$2" -format webp -quality 80`,
          'sh',
          scratch,
          dstDir,
        ],
        { stdio: ['ignore', 'inherit', 'pipe'] },
      );
      if (r.status !== 0) {
        missing += group.length;
        if (warnFailure) {
          const stderr = r.stderr ? r.stderr.toString().trim() : '';
          console.warn(
            `[icon] magick mogrify failed in ${dstDir}: exit ${r.status}${stderr ? `\n${stderr}` : ''}`,
          );
        }
        continue;
      }
      converted += group.length;
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }

  return { converted, missing };
}

export function reportConversion(result: IconConvertResult, dstDir: string): void {
  const tail = result.missing ? ` (${result.missing} missing/failed)` : '';
  console.log(`Converted ${result.converted} icons to ${dstDir}${tail}`);
}
