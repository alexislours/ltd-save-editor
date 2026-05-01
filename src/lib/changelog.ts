export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.9.0',
    date: '2026-05-02',
    changes: [
      'Added editors for each Mii’s belongings and worn outfit.',
      'Added a clothing sets editor in the Player tab.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-04-30',
    changes: [
      'Added a full UGC editor (export and replace textures).',
      'Added a habit editor sub-tab in the Mii tab.',
      'Fixed the weekly shop banner persisting after using the bulk interior unlocker.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-04-29',
    changes: [
      'Added the new ShareMii tab that allows exporting and importing Miis and UGC files.',
      'Added an unlocker for the Island size in the Player tab.',
      'Added a way to restore the previously loaded save on page reload.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-04-29',
    changes: [
      'Added a UGC text editor in the Player tab.',
      'Added a complexity warning on the Mii troubles tab.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-04-28',
    changes: [
      'Added a buildings unlocker in the Player tab.',
      'Added a rectangle drawing tool to the Map tab alongside the existing pencil tool.',
      'Improved mobile design.',
      'Added fr-US and en-EU locale support.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-04-27',
    changes: [
      'Added a Mii troubles editor in the Mii tab.',
      'Added a Mii Words editor in the Mii tab.',
      'Added editors for each Mii’s ranked foods and tasted-foods history.',
      'Added an interiors unlocker grouped by room-style variation in the Player tab.',
      'Added bulk loading and exporting of saves: drop a folder or .zip to route each file to the right tab, and export everything at once.',
      'Added a Frequently Asked Questions page.',
      'Added a site-wide footer with links to GitHub, the issue tracker, Discord, and the license.',
    ],
  },
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
