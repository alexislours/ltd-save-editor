export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.3.0',
    date: '2026-04-27',
    changes: [
      'Added a Mii gender and attraction editor in the Mii tab.',
      'Added a way to edit fountain level and wish counter in the Player tab.',
      'Added dark mode support.',
      'Added a link to the beta version.',
      'Added editing of crush and relationship-set timestamps in the Mii tab.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-04-26',
    changes: [
      'Added Brazilian Portuguese translation.',
      'Credited translators on the About page.',
      'Added a dropdown to bulk-edit enum values in the advanced editor.',
      'Improved spoiler caption to clarify what is revealed.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-04-26',
    changes: [
      'Added foods, clothes, and treasures unlock editors to the Player tab.',
      'Added a Mii food preferences editor.',
    ],
  },
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
