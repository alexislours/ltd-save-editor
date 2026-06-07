import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default {
  preprocess: vitePreprocess(),
  kit: {
    version: { name: pkg.version },
    inlineStyleThreshold: 100_000,
    alias: {
      $gen: 'src/generated',
      '@alexislours/ltd-savedata/schema': 'packages/ltd-savedata/src/schema',
      '@alexislours/ltd-savedata': 'packages/ltd-savedata/src',
      '@alexislours/ltd-textures/build': 'packages/ltd-textures/build',
      '@alexislours/ltd-textures': 'packages/ltd-textures/src',
    },
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: '404.html',
      precompress: false,
      strict: true,
    }),
  },
};
