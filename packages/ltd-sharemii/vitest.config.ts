import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@alexislours/ltd-savedata/schema': fileURLToPath(
        new URL('../ltd-savedata/src/schema/index.ts', import.meta.url),
      ),
      '@alexislours/ltd-savedata': fileURLToPath(
        new URL('../ltd-savedata/src/index.ts', import.meta.url),
      ),
    },
  },
});
