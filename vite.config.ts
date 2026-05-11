import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { i18nNamespace } from './tools/vite-plugin-i18n-namespace';
import { I18N_CONFIG } from './tools/i18n-config';

export default defineConfig({
  plugins: [sveltekit(), tailwindcss(), i18nNamespace(I18N_CONFIG)],
  worker: {
    format: 'es',
  },
});
