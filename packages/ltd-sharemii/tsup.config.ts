import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  outDir: 'dist',
  target: 'es2023',
  sourcemap: true,
});
