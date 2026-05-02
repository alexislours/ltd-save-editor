<script lang="ts">
  import { tick } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { driver, type Driver } from 'driver.js';
  import 'driver.js/dist/driver.css';
  import { track } from './analytics';
  import { getPath, navigate } from './navigation.svelte';
  import { getSave } from './saveFile.svelte';

  type DriverStep = Parameters<Driver['setSteps']>[0][number];

  type Tutorial = {
    id: 'getting-started' | 'save-bar' | 'player' | 'mii' | 'map' | 'sharemii' | 'ugc';
    name: string;
    description: string;
    route?: string;
    available: boolean;
    iconPath: string;
    accent: string;
    buildSteps: () => DriverStep[];
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

  function clickSubtab(value: string): void {
    const btn = document.querySelector<HTMLButtonElement>(
      `[data-tutorial="subtabs"] [data-subtab="${value}"]`,
    );
    btn?.click();
  }

  let activeDriver: Driver | null = null;
  let open = $state(false);
  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  const playerLoaded = $derived(getSave('player')?.parsed != null);
  const miiLoaded = $derived(getSave('mii')?.parsed != null);
  const mapLoaded = $derived(getSave('map')?.parsed != null);

  function exists(selector: string): boolean {
    return typeof document !== 'undefined' && document.querySelector(selector) !== null;
  }

  function whenAvailable(
    selector: string,
    step: DriverStep,
  ): { selector: string; step: DriverStep } {
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

  function gettingStartedSteps(): DriverStep[] {
    return compact([
      {
        popover: {
          title: $_('tutorial.gs.welcome.title'),
          description: $_('tutorial.gs.welcome.description'),
        },
      },
      whenAvailable('[data-tutorial="nav"]', {
        element: '[data-tutorial="nav"]',
        popover: {
          title: $_('tutorial.gs.nav.title'),
          description: $_('tutorial.gs.nav.description'),
          side: 'bottom',
          align: 'start',
        },
      }),
      whenAvailable('[data-tutorial="drop-zone"]', {
        element: '[data-tutorial="drop-zone"]',
        popover: {
          title: $_('tutorial.gs.drop.title'),
          description: $_('tutorial.gs.drop.description'),
          side: 'top',
          align: 'center',
        },
      }),
      whenAvailable('[data-tutorial="warning"]', {
        element: '[data-tutorial="warning"]',
        popover: {
          title: $_('tutorial.gs.backup.title'),
          description: $_('tutorial.gs.backup.description'),
          side: 'top',
          align: 'center',
        },
      }),
      {
        popover: {
          title: $_('tutorial.gs.done.title'),
          description: $_('tutorial.gs.done.description'),
        },
      },
    ]);
  }

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

  function subtabStep(value: string, titleKey: string, descKey: string): DriverStep {
    const selector = `[data-tutorial="subtabs"] [data-subtab="${value}"]`;
    return {
      element: selector,
      onHighlightStarted: (el) => {
        (el as HTMLButtonElement | undefined)?.click();
      },
      popover: {
        title: $_(titleKey),
        description: $_(descKey),
        side: 'bottom',
        align: 'start',
      },
    };
  }

  function subtabWalk(
    values: readonly string[],
    keyPrefix: string,
  ): { selector: string; step: DriverStep }[] {
    return values.map((value) =>
      whenAvailable(
        `[data-tutorial="subtabs"] [data-subtab="${value}"]`,
        subtabStep(value, `${keyPrefix}.${value}.title`, `${keyPrefix}.${value}.description`),
      ),
    );
  }

  function playerSteps(): DriverStep[] {
    return compact([
      {
        popover: {
          title: $_('tutorial.player.intro.title'),
          description: $_('tutorial.player.intro.description'),
        },
      },
      whenAvailable('[data-tutorial="subtabs"]', {
        element: '[data-tutorial="subtabs"]',
        popover: {
          title: $_('tutorial.player.subtabs.title'),
          description: $_('tutorial.player.subtabs.description'),
          side: 'bottom',
          align: 'start',
        },
      }),
      ...subtabWalk(PLAYER_SUBTAB_ORDER, 'tutorial.player.tabs'),
      {
        popover: {
          title: $_('tutorial.player.outro.title'),
          description: $_('tutorial.player.outro.description'),
        },
      },
    ]);
  }

  function saveBarSteps(): DriverStep[] {
    return compact([
      {
        popover: {
          title: $_('tutorial.save_bar.intro.title'),
          description: $_('tutorial.save_bar.intro.description'),
        },
      },
      whenAvailable('[data-tutorial="save-bar"]', {
        element: '[data-tutorial="save-bar"]',
        popover: {
          title: $_('tutorial.save_bar.bar.title'),
          description: $_('tutorial.save_bar.bar.description'),
          side: 'bottom',
          align: 'center',
        },
      }),
      whenAvailable('[data-tutorial="save-bar-status"]', {
        element: '[data-tutorial="save-bar-status"]',
        popover: {
          title: $_('tutorial.save_bar.status.title'),
          description: $_('tutorial.save_bar.status.description'),
          side: 'bottom',
          align: 'start',
        },
      }),
      whenAvailable('[data-tutorial="save-bar-open"]', {
        element: '[data-tutorial="save-bar-open"]',
        popover: {
          title: $_('tutorial.save_bar.open.title'),
          description: $_('tutorial.save_bar.open.description'),
          side: 'bottom',
          align: 'end',
        },
      }),
      whenAvailable('[data-tutorial="save-bar-export"]', {
        element: '[data-tutorial="save-bar-export"]',
        popover: {
          title: $_('tutorial.save_bar.export.title'),
          description: $_('tutorial.save_bar.export.description'),
          side: 'bottom',
          align: 'end',
        },
      }),
      whenAvailable('[data-tutorial="save-bar-clear"]', {
        element: '[data-tutorial="save-bar-clear"]',
        popover: {
          title: $_('tutorial.save_bar.clear.title'),
          description: $_('tutorial.save_bar.clear.description'),
          side: 'bottom',
          align: 'end',
        },
      }),
      whenAvailable('[data-tutorial="save-bar-download"]', {
        element: '[data-tutorial="save-bar-download"]',
        popover: {
          title: $_('tutorial.save_bar.download.title'),
          description: $_('tutorial.save_bar.download.description'),
          side: 'bottom',
          align: 'end',
        },
      }),
    ]);
  }

  function miiSteps(): DriverStep[] {
    return compact([
      {
        popover: {
          title: $_('tutorial.mii.intro.title'),
          description: $_('tutorial.mii.intro.description'),
        },
      },
      whenAvailable('[data-tutorial="subtabs"]', {
        element: '[data-tutorial="subtabs"]',
        popover: {
          title: $_('tutorial.mii.subtabs.title'),
          description: $_('tutorial.mii.subtabs.description'),
          side: 'bottom',
          align: 'start',
        },
      }),
      ...subtabWalk(MII_SUBTAB_ORDER, 'tutorial.mii.tabs'),
      {
        popover: {
          title: $_('tutorial.mii.outro.title'),
          description: $_('tutorial.mii.outro.description'),
        },
      },
    ]);
  }

  function mapSteps(): DriverStep[] {
    return compact([
      {
        popover: {
          title: $_('tutorial.map.intro.title'),
          description: $_('tutorial.map.intro.description'),
        },
      },
      whenAvailable('[data-tutorial="subtabs"]', {
        element: '[data-tutorial="subtabs"]',
        popover: {
          title: $_('tutorial.map.subtabs.title'),
          description: $_('tutorial.map.subtabs.description'),
          side: 'bottom',
          align: 'start',
        },
      }),
      ...subtabWalk(MAP_SUBTAB_ORDER, 'tutorial.map.tabs'),
      {
        popover: {
          title: $_('tutorial.map.outro.title'),
          description: $_('tutorial.map.outro.description'),
        },
      },
    ]);
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

  function shareMiiSteps(): DriverStep[] {
    return compact([
      {
        popover: {
          title: $_('tutorial.sharemii.intro.title'),
          description: $_('tutorial.sharemii.intro.description'),
        },
      },
      whenAvailable('[data-tutorial="subtabs"]', {
        element: '[data-tutorial="subtabs"]',
        popover: {
          title: $_('tutorial.sharemii.kinds.title'),
          description: $_('tutorial.sharemii.kinds.description'),
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
          title: $_('tutorial.sharemii.replace.title'),
          description: $_('tutorial.sharemii.replace.description'),
          side: 'top',
          align: 'start',
        },
      }),
      {
        element: '[data-tutorial="sharemii-import-file"]',
        popover: {
          title: $_('tutorial.sharemii.import_file.title'),
          description: $_('tutorial.sharemii.import_file.description'),
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tutorial="sharemii-import-target"]',
        popover: {
          title: $_('tutorial.sharemii.import_target.title'),
          description: $_('tutorial.sharemii.import_target.description'),
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tutorial="sharemii-import-apply"]',
        popover: {
          title: $_('tutorial.sharemii.import_apply.title'),
          description: $_('tutorial.sharemii.import_apply.description'),
          side: 'top',
          align: 'end',
        },
      },
      whenAvailable('[data-tutorial="save-bar-export"]', {
        element: '[data-tutorial="save-bar-export"]',
        onHighlightStarted: () => closeImportPanel(),
        popover: {
          title: $_('tutorial.sharemii.save_bar_export.title'),
          description: $_('tutorial.sharemii.save_bar_export.description'),
          side: 'bottom',
          align: 'end',
        },
      }),
      whenAvailable('[data-tutorial="sharemii-rows"] [data-tutorial-row-export]', {
        element: '[data-tutorial="sharemii-rows"] [data-tutorial-row-export]',
        popover: {
          title: $_('tutorial.sharemii.export_row.title'),
          description: $_('tutorial.sharemii.export_row.description'),
          side: 'top',
          align: 'start',
        },
      }),
      {
        popover: {
          title: $_('tutorial.sharemii.outro.title'),
          description: $_('tutorial.sharemii.outro.description'),
        },
      },
    ]);
  }

  function clickFirstUgcRow(): void {
    firstMatch('[data-tutorial="ugc-rows"] [data-tutorial-ugc-row]')?.click();
  }

  function ugcSteps(): DriverStep[] {
    return compact([
      {
        popover: {
          title: $_('tutorial.ugc.intro.title'),
          description: $_('tutorial.ugc.intro.description'),
        },
      },
      whenAvailable('[data-tutorial="subtabs"]', {
        element: '[data-tutorial="subtabs"]',
        popover: {
          title: $_('tutorial.ugc.kinds.title'),
          description: $_('tutorial.ugc.kinds.description'),
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
          title: $_('tutorial.ugc.pick_slot.title'),
          description: $_('tutorial.ugc.pick_slot.description'),
          side: 'right',
          align: 'start',
        },
      }),
      {
        element: '[data-tutorial="ugc-editor"]',
        popover: {
          title: $_('tutorial.ugc.editor.title'),
          description: $_('tutorial.ugc.editor.description'),
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '[data-tutorial="ugc-drop"]',
        popover: {
          title: $_('tutorial.ugc.drop.title'),
          description: $_('tutorial.ugc.drop.description'),
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '[data-tutorial="ugc-replace"]',
        popover: {
          title: $_('tutorial.ugc.replace.title'),
          description: $_('tutorial.ugc.replace.description'),
          side: 'top',
          align: 'end',
        },
      },
      whenAvailable('[data-tutorial="save-bar-download"]', {
        element: '[data-tutorial="save-bar-download"]',
        popover: {
          title: $_('tutorial.ugc.download_pending.title'),
          description: $_('tutorial.ugc.download_pending.description'),
          side: 'bottom',
          align: 'end',
        },
      }),
      {
        popover: {
          title: $_('tutorial.ugc.outro.title'),
          description: $_('tutorial.ugc.outro.description'),
        },
      },
    ]);
  }

  const saveBarRoute = $derived.by(() => {
    if (playerLoaded) return '/player';
    if (miiLoaded) return '/mii';
    if (mapLoaded) return '/map';
    return undefined;
  });

  const tutorials = $derived<Tutorial[]>([
    {
      id: 'getting-started',
      name: $_('tutorial.gs.name'),
      description: $_('tutorial.gs.description'),
      route: '/player',
      available: !playerLoaded && !miiLoaded && !mapLoaded,
      iconPath: ICONS.rocket,
      accent: 'bg-orange-500/15 text-orange-600 ring-orange-500/30',
      buildSteps: gettingStartedSteps,
    },
    {
      id: 'save-bar',
      name: $_('tutorial.save_bar.name'),
      description: $_('tutorial.save_bar.description'),
      route: saveBarRoute,
      available: playerLoaded || miiLoaded || mapLoaded,
      iconPath: ICONS.download,
      accent: 'bg-teal-500/15 text-teal-700 ring-teal-500/30',
      buildSteps: saveBarSteps,
    },
    {
      id: 'player',
      name: $_('tutorial.player.name'),
      description: $_('tutorial.player.description'),
      route: '/player',
      available: playerLoaded,
      iconPath: ICONS.person,
      accent: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30',
      buildSteps: playerSteps,
    },
    {
      id: 'mii',
      name: $_('tutorial.mii.name'),
      description: $_('tutorial.mii.description'),
      route: '/mii',
      available: miiLoaded,
      iconPath: ICONS.users,
      accent: 'bg-violet-500/15 text-violet-700 ring-violet-500/30',
      buildSteps: miiSteps,
    },
    {
      id: 'map',
      name: $_('tutorial.map.name'),
      description: $_('tutorial.map.description'),
      route: '/map',
      available: mapLoaded,
      iconPath: ICONS.map,
      accent: 'bg-sky-500/15 text-sky-700 ring-sky-500/30',
      buildSteps: mapSteps,
    },
    {
      id: 'sharemii',
      name: $_('tutorial.sharemii.name'),
      description: $_('tutorial.sharemii.description'),
      route: '/sharemii',
      available: playerLoaded,
      iconPath: ICONS.share,
      accent: 'bg-rose-500/15 text-rose-700 ring-rose-500/30',
      buildSteps: shareMiiSteps,
    },
    {
      id: 'ugc',
      name: $_('tutorial.ugc.name'),
      description: $_('tutorial.ugc.description'),
      route: '/ugc',
      available: playerLoaded,
      iconPath: ICONS.palette,
      accent: 'bg-amber-500/15 text-amber-700 ring-amber-500/30',
      buildSteps: ugcSteps,
    },
  ]);

  const visibleTutorials = $derived(tutorials.filter((t) => t.available));

  function startDriver(tutorialId: Tutorial['id'], steps: DriverStep[], onEnd?: () => void): void {
    activeDriver?.destroy();
    if (steps.length === 0) return;
    let dismissed = false;
    let lastIndex = 0;
    const d = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 6,
      stageRadius: 12,
      overlayOpacity: 0.65,
      nextBtnText: $_('tutorial.next'),
      prevBtnText: $_('tutorial.prev'),
      doneBtnText: $_('tutorial.done'),
      progressText: '{{current}} / {{total}}',
      steps,
      onCloseClick: (_el, _step, opts) => {
        dismissed = true;
        opts.driver.destroy();
      },
      onDestroyStarted: (_el, _step, opts) => {
        lastIndex = opts.driver.getActiveIndex() ?? lastIndex;
        if (!opts.driver.isLastStep()) dismissed = true;
        opts.driver.destroy();
      },
      onDestroyed: () => {
        activeDriver = null;
        if (dismissed) {
          track('tutorial_dismissed', {
            tutorial: tutorialId,
            step: lastIndex + 1,
            steps: steps.length,
          });
        } else {
          track('tutorial_completed', { tutorial: tutorialId, steps: steps.length });
        }
        onEnd?.();
      },
    });
    activeDriver = d;
    d.drive();
  }

  function waitForElement(selector: string, timeoutMs = 1500): Promise<void> {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        resolve();
        return;
      }
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeoutMs);
    });
  }

  function firstStepSelector(t: Tutorial): string {
    if (t.id === 'save-bar') return '[data-tutorial="save-bar"]';
    if (t.id === 'sharemii') return '[data-tutorial="sharemii-rows"]';
    if (t.id === 'ugc') return '[data-tutorial="ugc-rows"]';
    if (t.id === 'player') return '[data-subtab="foods"]';
    if (t.id === 'mii') return '[data-subtab="relationships"]';
    if (t.id === 'map') return '[data-subtab="floor"]';
    return '[data-tutorial="nav"]';
  }

  function activeSubtab(): string | null {
    return (
      document
        .querySelector<HTMLElement>('[data-tutorial="subtabs"] [aria-current="page"]')
        ?.getAttribute('data-subtab') ?? null
    );
  }

  async function start(t: Tutorial): Promise<void> {
    open = false;
    track('tutorial_started', { from: getPath(), tutorial: t.id });
    if (t.route && getPath() !== t.route) {
      navigate(t.route);
      await tick();
      await waitForElement(firstStepSelector(t), 3000);
    }
    const initialSubtab = activeSubtab();
    startDriver(t.id, t.buildSteps(), () => {
      if (initialSubtab && initialSubtab !== activeSubtab()) clickSubtab(initialSubtab);
    });
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === dialog) open = false;
  }
</script>

<button
  type="button"
  onclick={() => (open = true)}
  aria-haspopup="dialog"
  class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-content-strong shadow-sm ring-1 ring-edge/60 transition-colors hover:bg-surface-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
>
  <svg
    class="h-4 w-4 text-orange-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
    />
  </svg>
  {$_('tutorial.button')}
</button>

<dialog
  bind:this={dialog}
  onclose={() => (open = false)}
  onclick={handleBackdropClick}
  class="m-auto w-[min(36rem,calc(100vw_-_2rem))] rounded-2xl bg-surface p-0 text-content-strong shadow-2xl ring-1 ring-edge/60 backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
>
  <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
    <div class="min-w-0">
      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-brand/90">
        {$_('tutorial.dialog_eyebrow')}
      </p>
      <h2 class="mt-1 text-xl font-bold text-content-strong">
        {$_('tutorial.dialog_title')}
      </h2>
      <p class="mt-1 text-sm text-content-muted">
        {$_('tutorial.dialog_intro')}
      </p>
    </div>
    <button
      type="button"
      onclick={() => (open = false)}
      aria-label={$_('tutorial.dialog_close')}
      class="-mt-1 -mr-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-muted hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  </header>

  <div class="max-h-[70vh] overflow-y-auto px-3 pt-2 pb-5 sm:px-4">
    <ul class="flex flex-col gap-2">
      {#each visibleTutorials as t (t.id)}
        <li>
          <button
            type="button"
            onclick={() => start(t)}
            class="group relative flex w-full items-center gap-4 rounded-xl border border-edge/40 bg-surface px-4 py-3.5 text-left transition-all hover:-translate-y-px hover:border-orange-400/70 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            <span
              class={[
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
                t.accent,
              ]}
              aria-hidden="true"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d={t.iconPath} />
              </svg>
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="text-sm font-bold text-content-strong">{t.name}</span>
              <span class="text-xs leading-relaxed text-content-muted">{t.description}</span>
            </span>
            <svg
              class="h-4 w-4 shrink-0 text-content-faint transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.25"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</dialog>
