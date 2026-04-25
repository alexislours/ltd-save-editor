export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-04-25',
    changes: [
      'Added internationalization support (English and French).',
      'Added a version badge highlighting unseen changelog entries.',
      'Detect and warn when a save file is dropped in the wrong tab.',
      'Restored pointer cursor on interactive elements.',
      'Prevented flicker when navigating between tabs.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-04-25',
    changes: ['Initial public release.'],
  },
];
