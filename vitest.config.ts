import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [sveltekit()],
        test: {
          name: 'app',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
        },
        resolve: {
          conditions: ['browser'],
        },
      },
      'packages/*/vitest.config.ts',
    ],
  },
});
