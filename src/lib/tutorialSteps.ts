import type { Driver } from 'driver.js';

export type DriverStep = Parameters<Driver['setSteps']>[0][number];
type Translate = (key: string) => string;
export type TutorialId =
  | 'getting-started'
  | 'save-bar'
  | 'player'
  | 'mii'
  | 'map'
  | 'sharemii'
  | 'ugc';

const PLAYER_SUBTAB_ORDER = [
  'profile',
  'foods',
  'clothes',
  'clothing_sets',
  'treasures',
  'interiors',
  'buildings',
  'ugc',
  'advanced',
] as const;

const MII_SUBTAB_ORDER = [
  'profile',
  'relationships',
  'belongings',
  'troubles',
  'habits',
  'advanced',
] as const;

const MAP_SUBTAB_ORDER = ['floor', 'objects', 'advanced'] as const;

function exists(selector: string): boolean {
  return typeof document !== 'undefined' && document.querySelector(selector) !== null;
}

function whenAvailable(selector: string, step: DriverStep): { selector: string; step: DriverStep } {
  return { selector, step };
}

function compact(items: ({ selector?: string; step: DriverStep } | DriverStep)[]): DriverStep[] {
  const steps: DriverStep[] = [];
  for (const item of items) {
    if ('step' in item) {
      if (!item.selector || exists(item.selector)) steps.push(item.step);
    } else {
      steps.push(item);
    }
  }
  return steps;
}

function subtabStep(t: Translate, value: string, titleKey: string, descKey: string): DriverStep {
  const selector = `[data-tutorial="subtabs"] [data-subtab="${value}"]`;
  return {
    element: selector,
    onHighlightStarted: (el) => {
      (el as HTMLButtonElement | undefined)?.click();
    },
    popover: {
      title: t(titleKey),
      description: t(descKey),
      side: 'bottom',
      align: 'start',
    },
  };
}

function subtabWalk(
  t: Translate,
  values: readonly string[],
  keyPrefix: string,
): { selector: string; step: DriverStep }[] {
  return values.map((value) =>
    whenAvailable(
      `[data-tutorial="subtabs"] [data-subtab="${value}"]`,
      subtabStep(t, value, `${keyPrefix}.${value}.title`, `${keyPrefix}.${value}.description`),
    ),
  );
}

function firstMatch(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(selector);
}

function clickFirstRowReplace(): void {
  firstMatch('[data-tutorial="sharemii-rows"] [data-tutorial-row-replace]')?.click();
}

function closeImportPanel(): void {
  if (firstMatch('[data-tutorial="sharemii-import-panel"]')) {
    const cancel = document.querySelector<HTMLButtonElement>(
      '[data-tutorial="sharemii-import-panel"] button',
    );
    cancel?.click();
  }
}

function clickFirstUgcRow(): void {
  firstMatch('[data-tutorial="ugc-rows"] [data-tutorial-ugc-row]')?.click();
}

function gettingStartedSteps(t: Translate): DriverStep[] {
  return compact([
    {
      popover: {
        title: t('tutorial.gs.welcome.title'),
        description: t('tutorial.gs.welcome.description'),
      },
    },
    whenAvailable('[data-tutorial="nav"]', {
      element: '[data-tutorial="nav"]',
      popover: {
        title: t('tutorial.gs.nav.title'),
        description: t('tutorial.gs.nav.description'),
        side: 'bottom',
        align: 'start',
      },
    }),
    whenAvailable('[data-tutorial="drop-zone"]', {
      element: '[data-tutorial="drop-zone"]',
      popover: {
        title: t('tutorial.gs.drop.title'),
        description: t('tutorial.gs.drop.description'),
        side: 'top',
        align: 'center',
      },
    }),
    whenAvailable('[data-tutorial="warning"]', {
      element: '[data-tutorial="warning"]',
      popover: {
        title: t('tutorial.gs.backup.title'),
        description: t('tutorial.gs.backup.description'),
        side: 'top',
        align: 'center',
      },
    }),
    {
      popover: {
        title: t('tutorial.gs.done.title'),
        description: t('tutorial.gs.done.description'),
      },
    },
  ]);
}

function saveBarSteps(t: Translate): DriverStep[] {
  return compact([
    {
      popover: {
        title: t('tutorial.save_bar.intro.title'),
        description: t('tutorial.save_bar.intro.description'),
      },
    },
    whenAvailable('[data-tutorial="save-bar"]', {
      element: '[data-tutorial="save-bar"]',
      popover: {
        title: t('tutorial.save_bar.bar.title'),
        description: t('tutorial.save_bar.bar.description'),
        side: 'bottom',
        align: 'center',
      },
    }),
    whenAvailable('[data-tutorial="save-bar-status"]', {
      element: '[data-tutorial="save-bar-status"]',
      popover: {
        title: t('tutorial.save_bar.status.title'),
        description: t('tutorial.save_bar.status.description'),
        side: 'bottom',
        align: 'start',
      },
    }),
    whenAvailable('[data-tutorial="save-bar-open"]', {
      element: '[data-tutorial="save-bar-open"]',
      popover: {
        title: t('tutorial.save_bar.open.title'),
        description: t('tutorial.save_bar.open.description'),
        side: 'bottom',
        align: 'end',
      },
    }),
    whenAvailable('[data-tutorial="save-bar-export"]', {
      element: '[data-tutorial="save-bar-export"]',
      popover: {
        title: t('tutorial.save_bar.export.title'),
        description: t('tutorial.save_bar.export.description'),
        side: 'bottom',
        align: 'end',
      },
    }),
    whenAvailable('[data-tutorial="save-bar-clear"]', {
      element: '[data-tutorial="save-bar-clear"]',
      popover: {
        title: t('tutorial.save_bar.clear.title'),
        description: t('tutorial.save_bar.clear.description'),
        side: 'bottom',
        align: 'end',
      },
    }),
    whenAvailable('[data-tutorial="save-bar-download"]', {
      element: '[data-tutorial="save-bar-download"]',
      popover: {
        title: t('tutorial.save_bar.download.title'),
        description: t('tutorial.save_bar.download.description'),
        side: 'bottom',
        align: 'end',
      },
    }),
  ]);
}

function playerSteps(t: Translate): DriverStep[] {
  return compact([
    {
      popover: {
        title: t('tutorial.player.intro.title'),
        description: t('tutorial.player.intro.description'),
      },
    },
    whenAvailable('[data-tutorial="subtabs"]', {
      element: '[data-tutorial="subtabs"]',
      popover: {
        title: t('tutorial.player.subtabs.title'),
        description: t('tutorial.player.subtabs.description'),
        side: 'bottom',
        align: 'start',
      },
    }),
    ...subtabWalk(t, PLAYER_SUBTAB_ORDER, 'tutorial.player.tabs'),
    {
      popover: {
        title: t('tutorial.player.outro.title'),
        description: t('tutorial.player.outro.description'),
      },
    },
  ]);
}

function miiSteps(t: Translate): DriverStep[] {
  return compact([
    {
      popover: {
        title: t('tutorial.mii.intro.title'),
        description: t('tutorial.mii.intro.description'),
      },
    },
    whenAvailable('[data-tutorial="subtabs"]', {
      element: '[data-tutorial="subtabs"]',
      popover: {
        title: t('tutorial.mii.subtabs.title'),
        description: t('tutorial.mii.subtabs.description'),
        side: 'bottom',
        align: 'start',
      },
    }),
    ...subtabWalk(t, MII_SUBTAB_ORDER, 'tutorial.mii.tabs'),
    {
      popover: {
        title: t('tutorial.mii.outro.title'),
        description: t('tutorial.mii.outro.description'),
      },
    },
  ]);
}

function mapSteps(t: Translate): DriverStep[] {
  return compact([
    {
      popover: {
        title: t('tutorial.map.intro.title'),
        description: t('tutorial.map.intro.description'),
      },
    },
    whenAvailable('[data-tutorial="subtabs"]', {
      element: '[data-tutorial="subtabs"]',
      popover: {
        title: t('tutorial.map.subtabs.title'),
        description: t('tutorial.map.subtabs.description'),
        side: 'bottom',
        align: 'start',
      },
    }),
    ...subtabWalk(t, MAP_SUBTAB_ORDER, 'tutorial.map.tabs'),
    {
      popover: {
        title: t('tutorial.map.outro.title'),
        description: t('tutorial.map.outro.description'),
      },
    },
  ]);
}

function shareMiiSteps(t: Translate): DriverStep[] {
  return compact([
    {
      popover: {
        title: t('tutorial.sharemii.intro.title'),
        description: t('tutorial.sharemii.intro.description'),
      },
    },
    whenAvailable('[data-tutorial="subtabs"]', {
      element: '[data-tutorial="subtabs"]',
      popover: {
        title: t('tutorial.sharemii.kinds.title'),
        description: t('tutorial.sharemii.kinds.description'),
        side: 'bottom',
        align: 'start',
      },
    }),
    whenAvailable('[data-tutorial="sharemii-rows"] [data-tutorial-row-replace]', {
      element: '[data-tutorial="sharemii-rows"] [data-tutorial-row-replace]',
      onHighlightStarted: () => {
        if (!firstMatch('[data-tutorial="sharemii-import-panel"]')) {
          clickFirstRowReplace();
        }
      },
      popover: {
        title: t('tutorial.sharemii.replace.title'),
        description: t('tutorial.sharemii.replace.description'),
        side: 'top',
        align: 'start',
      },
    }),
    {
      element: '[data-tutorial="sharemii-import-file"]',
      popover: {
        title: t('tutorial.sharemii.import_file.title'),
        description: t('tutorial.sharemii.import_file.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="sharemii-import-target"]',
      popover: {
        title: t('tutorial.sharemii.import_target.title'),
        description: t('tutorial.sharemii.import_target.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="sharemii-import-apply"]',
      popover: {
        title: t('tutorial.sharemii.import_apply.title'),
        description: t('tutorial.sharemii.import_apply.description'),
        side: 'top',
        align: 'end',
      },
    },
    whenAvailable('[data-tutorial="save-bar-export"]', {
      element: '[data-tutorial="save-bar-export"]',
      onHighlightStarted: () => closeImportPanel(),
      popover: {
        title: t('tutorial.sharemii.save_bar_export.title'),
        description: t('tutorial.sharemii.save_bar_export.description'),
        side: 'bottom',
        align: 'end',
      },
    }),
    whenAvailable('[data-tutorial="sharemii-rows"] [data-tutorial-row-export]', {
      element: '[data-tutorial="sharemii-rows"] [data-tutorial-row-export]',
      popover: {
        title: t('tutorial.sharemii.export_row.title'),
        description: t('tutorial.sharemii.export_row.description'),
        side: 'top',
        align: 'start',
      },
    }),
    {
      popover: {
        title: t('tutorial.sharemii.outro.title'),
        description: t('tutorial.sharemii.outro.description'),
      },
    },
  ]);
}

function ugcSteps(t: Translate): DriverStep[] {
  return compact([
    {
      popover: {
        title: t('tutorial.ugc.intro.title'),
        description: t('tutorial.ugc.intro.description'),
      },
    },
    whenAvailable('[data-tutorial="subtabs"]', {
      element: '[data-tutorial="subtabs"]',
      popover: {
        title: t('tutorial.ugc.kinds.title'),
        description: t('tutorial.ugc.kinds.description'),
        side: 'bottom',
        align: 'start',
      },
    }),
    whenAvailable('[data-tutorial="ugc-rows"] [data-tutorial-ugc-row]', {
      element: '[data-tutorial="ugc-rows"] [data-tutorial-ugc-row]',
      onHighlightStarted: () => {
        if (!firstMatch('[data-tutorial="ugc-drop"]')) {
          clickFirstUgcRow();
        }
      },
      popover: {
        title: t('tutorial.ugc.pick_slot.title'),
        description: t('tutorial.ugc.pick_slot.description'),
        side: 'right',
        align: 'start',
      },
    }),
    {
      element: '[data-tutorial="ugc-editor"]',
      popover: {
        title: t('tutorial.ugc.editor.title'),
        description: t('tutorial.ugc.editor.description'),
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="ugc-drop"]',
      popover: {
        title: t('tutorial.ugc.drop.title'),
        description: t('tutorial.ugc.drop.description'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tutorial="ugc-replace"]',
      popover: {
        title: t('tutorial.ugc.replace.title'),
        description: t('tutorial.ugc.replace.description'),
        side: 'top',
        align: 'end',
      },
    },
    whenAvailable('[data-tutorial="save-bar-download"]', {
      element: '[data-tutorial="save-bar-download"]',
      popover: {
        title: t('tutorial.ugc.download_pending.title'),
        description: t('tutorial.ugc.download_pending.description'),
        side: 'bottom',
        align: 'end',
      },
    }),
    {
      popover: {
        title: t('tutorial.ugc.outro.title'),
        description: t('tutorial.ugc.outro.description'),
      },
    },
  ]);
}

export const TUTORIAL_STEP_BUILDERS: Record<TutorialId, (t: Translate) => DriverStep[]> = {
  'getting-started': gettingStartedSteps,
  'save-bar': saveBarSteps,
  player: playerSteps,
  mii: miiSteps,
  map: mapSteps,
  sharemii: shareMiiSteps,
  ugc: ugcSteps,
};

export function firstStepSelector(id: TutorialId): string {
  if (id === 'save-bar') return '[data-tutorial="save-bar"]';
  if (id === 'sharemii') return '[data-tutorial="sharemii-rows"]';
  if (id === 'ugc') return '[data-tutorial="ugc-rows"]';
  if (id === 'player') return '[data-subtab="foods"]';
  if (id === 'mii') return '[data-subtab="relationships"]';
  if (id === 'map') return '[data-subtab="floor"]';
  return '[data-tutorial="nav"]';
}

type TutorialRoute = '/player' | '/mii' | '/map' | '/sharemii' | '/ugc';

export type TutorialEntry = {
  id: TutorialId;
  name: string;
  description: string;
  route?: TutorialRoute;
  available: boolean;
  iconPath: string;
  accent: string;
};

const ICONS = {
  rocket:
    'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
  person:
    'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  users:
    'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  map: 'M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z',
  share:
    'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
  palette:
    'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42',
  download:
    'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3',
};

export function buildTutorials(
  t: Translate,
  loaded: { player: boolean; mii: boolean; map: boolean },
): TutorialEntry[] {
  const { player: playerLoaded, mii: miiLoaded, map: mapLoaded } = loaded;
  const saveBarRoute: TutorialRoute | undefined = playerLoaded
    ? '/player'
    : miiLoaded
      ? '/mii'
      : mapLoaded
        ? '/map'
        : undefined;
  return [
    {
      id: 'getting-started',
      name: t('tutorial.gs.name'),
      description: t('tutorial.gs.description'),
      route: '/player',
      available: !playerLoaded && !miiLoaded && !mapLoaded,
      iconPath: ICONS.rocket,
      accent: 'bg-orange-500/15 text-orange-600 ring-orange-500/30',
    },
    {
      id: 'save-bar',
      name: t('tutorial.save_bar.name'),
      description: t('tutorial.save_bar.description'),
      route: saveBarRoute,
      available: playerLoaded || miiLoaded || mapLoaded,
      iconPath: ICONS.download,
      accent: 'bg-teal-500/15 text-teal-700 ring-teal-500/30',
    },
    {
      id: 'player',
      name: t('tutorial.player.name'),
      description: t('tutorial.player.description'),
      route: '/player',
      available: playerLoaded,
      iconPath: ICONS.person,
      accent: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30',
    },
    {
      id: 'mii',
      name: t('tutorial.mii.name'),
      description: t('tutorial.mii.description'),
      route: '/mii',
      available: miiLoaded,
      iconPath: ICONS.users,
      accent: 'bg-violet-500/15 text-violet-700 ring-violet-500/30',
    },
    {
      id: 'map',
      name: t('tutorial.map.name'),
      description: t('tutorial.map.description'),
      route: '/map',
      available: mapLoaded,
      iconPath: ICONS.map,
      accent: 'bg-sky-500/15 text-sky-700 ring-sky-500/30',
    },
    {
      id: 'sharemii',
      name: t('tutorial.sharemii.name'),
      description: t('tutorial.sharemii.description'),
      route: '/sharemii',
      available: playerLoaded,
      iconPath: ICONS.share,
      accent: 'bg-rose-500/15 text-rose-700 ring-rose-500/30',
    },
    {
      id: 'ugc',
      name: t('tutorial.ugc.name'),
      description: t('tutorial.ugc.description'),
      route: '/ugc',
      available: playerLoaded,
      iconPath: ICONS.palette,
      accent: 'bg-amber-500/15 text-amber-700 ring-amber-500/30',
    },
  ];
}
