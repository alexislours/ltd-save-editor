import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default {
  preprocess: vitePreprocess(),
  kit: {
    version: { name: pkg.version },
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: '404.html',
      precompress: false,
      strict: true,
    }),
  },
};
