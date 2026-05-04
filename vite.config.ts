import { defineConfig, type Plugin } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Pulls the community-maintained hash list and stages it under static/ so it
// ships as a static asset and is fetched client-side (see src/lib/sav/hashList.svelte.ts).
// The file changes infrequently - re-download once per day to avoid hammering
// the upstream raw.githubusercontent.com endpoint during dev iteration.
function gameDataHashList(): Plugin {
  const URL =
    'https://raw.githubusercontent.com/tlmodding/ltd-gamedata/refs/heads/main/HashList/GameData.txt';
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;

  let fetched = false;
  async function ensure(root: string) {
    if (fetched) return;
    fetched = true;
    const out = resolve(root, 'static/GameData.txt');
    try {
      const age = Date.now() - statSync(out).mtimeMs;
      if (age < MAX_AGE_MS) return;
    } catch {
      // missing - fall through to download
    }
    try {
      const res = await fetch(URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      mkdirSync(resolve(root, 'static'), { recursive: true });
      writeFileSync(out, body);
      console.log(`[gamedata] fetched ${body.length} bytes -> static/GameData.txt`);
    } catch (err) {
      console.warn(`[gamedata] failed to refresh hash list: ${(err as Error).message}`);
      // Don't fail the build - the existing copy (if any) will still be served.
    }
  }

  return {
    name: 'gamedata-hash-list',
    async configResolved(config) {
      await ensure(config.root);
    },
  };
}

export default defineConfig({
  plugins: [gameDataHashList(), sveltekit(), tailwindcss()],
});
