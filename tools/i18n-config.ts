import { fileURLToPath } from 'node:url';

export const I18N_CONFIG = {
  messagesDir: fileURLToPath(new URL('../messages', import.meta.url)),
  aliases: { 'fr-US': 'fr-EU', 'en-EU': 'en-US' } as Record<string, string>,
  alwaysShared: 'app+beta+header+tab+error+lightbox+save+bulk+session+footer',
  typesPath: fileURLToPath(new URL('../src/generated/i18n-keys.d.ts', import.meta.url)),
  virtualTypesPath: fileURLToPath(new URL('../src/generated/i18n-virtual.d.ts', import.meta.url)),
  sourceLocale: 'en-US',
};
