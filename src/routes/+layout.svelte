<script lang="ts">
  import '../app.css';
  import '$lib/i18n/i18n';
  import { browser, version } from '$app/environment';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { PUBLIC_SITE_URL } from '$env/static/public';
  import type { Snippet } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { track } from '$lib/analytics';
  import BulkModals from '$lib/bulk/BulkModals.svelte';
  import { CHANGELOG } from '$lib/changelog/changelog';
  import ChangelogDialog from '$lib/changelog/ChangelogDialog.svelte';
  import Footer from '$lib/layout/Footer.svelte';
  import Lightbox from '$lib/ui/Lightbox.svelte';
  import LocaleSwitcher from '$lib/i18n/LocaleSwitcher.svelte';
  import RestoreSessionModal from '$lib/session/RestoreSessionModal.svelte';
  import { loadMiiLabels } from '$lib/mii/miiLabelList.svelte';
  import { loadClothList } from '$lib/sav/lists/clothList.svelte';
  import { loadCoordinateList } from '$lib/sav/lists/coordinateList.svelte';
  import { loadFoodList } from '$lib/sav/lists/foodList.svelte';
  import { loadHabitList } from '$lib/sav/lists/habitList.svelte';
  import { loadHashList } from '$lib/sav/lists/hashList.svelte';
  import { loadItemList } from '$lib/sav/lists/itemList.svelte';
  import { loadRoomStyleList } from '$lib/sav/lists/roomStyleList.svelte';
  import { loadTreasureList } from '$lib/sav/lists/treasureList.svelte';
  import { loadTroubleList } from '$lib/sav/lists/troubleList.svelte';
  import { loadWordKindLabels } from '$lib/sav/lists/wordKindLabels.svelte';
  import { bootRestoreScan } from '$lib/session/sessionRestore.svelte';
  import { flushAllPending } from '$lib/session/sessionPersist';
  import ThemeSwitcher from '$lib/theme/ThemeSwitcher.svelte';
  import Toaster from '$lib/toast/Toaster.svelte';
  import { TAB_PILL_CLASS } from '$lib/ui/styles';

  if (browser) {
    loadHashList();
    loadFoodList();
    loadClothList();
    loadCoordinateList();
    loadTreasureList();
    loadRoomStyleList();
    loadItemList();
    loadTroubleList();
    loadHabitList();
    loadWordKindLabels();
    loadMiiLabels();
  }

  type Props = { children: Snippet };
  let { children }: Props = $props();

  const BETA_URL = 'https://beta.ltd-save-editor.pages.dev';
  const STABLE_URL = 'https://ltd-save-editor.pages.dev';
  const isBeta = browser && window.location.hostname === 'beta.ltd-save-editor.pages.dev';

  const path = $derived(page.url.pathname);
  let changelogOpen = $state(false);

  const LAST_SEEN_KEY = 'ltd-save-editor:last-seen-changelog-version';
  const latestVersion = CHANGELOG[0]?.version ?? '';
  let hasNewChangelog = $state(false);

  $effect(() => {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    if (lastSeen === null) {
      localStorage.setItem(LAST_SEEN_KEY, latestVersion);
      return;
    }
    if (lastSeen !== latestVersion) hasNewChangelog = true;
  });

  $effect(() => {
    void bootRestoreScan();
    const flush = (): void => flushAllPending();
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  });

  function openChangelog(): void {
    track('changelog_opened', { had_new: hasNewChangelog, version: latestVersion });
    changelogOpen = true;
    hasNewChangelog = false;
    localStorage.setItem(LAST_SEEN_KEY, latestVersion);
  }

  const tabs = $derived([
    { route: '/player', label: $_('tab.player'), wip: false },
    { route: '/mii', label: $_('tab.mii'), wip: false },
    { route: '/map', label: $_('tab.map'), wip: false },
    { route: '/sharemii', label: $_('tab.sharemii'), wip: false },
    { route: '/ugc', label: $_('tab.ugc_editor'), wip: false },
    { route: '/history', label: $_('tab.history'), wip: false },
    { route: '/faq', label: $_('tab.faq'), wip: false },
    { route: '/about', label: $_('tab.about'), wip: false },
  ] as const);
</script>

<svelte:head>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="LTD Save Editor" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="{PUBLIC_SITE_URL}/og.png" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="2400" />
  <meta property="og:image:height" content="1350" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="{PUBLIC_SITE_URL}/og.png" />
</svelte:head>

<main class="flex min-h-svh flex-col bg-bg text-content">
  <div class="flex flex-1 flex-col">
    {#if isBeta}
      <div
        role="alert"
        class="bg-rose-600 px-4 py-1.5 text-center text-xs font-semibold text-white shadow-md sm:px-6 sm:py-2 sm:text-sm"
      >
        {$_('beta.warning')}
      </div>
    {/if}
    <header
      class={[
        'shadow-sm',
        isBeta ? 'bg-beta/90 ring-1 ring-beta-edge/70' : 'bg-header/90 ring-1 ring-edge/60',
      ]}
    >
      <div
        class="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:pt-6"
      >
        <div class="min-w-0">
          <p
            class={[
              'text-[11px] font-bold uppercase tracking-[0.18em] sm:text-xs',
              isBeta ? 'text-beta-content' : 'text-brand/90',
            ]}
          >
            {$_('app.title')}{#if isBeta}<span
                class="ml-2 inline-block rounded bg-rose-700 px-1.5 py-0.5 text-[10px] tracking-[0.2em] text-white"
                >{$_('beta.badge')}</span
              >{/if}
          </p>
          <h1 class="mt-0.5 text-lg font-bold text-content-strong sm:text-xl">
            {$_('app.game_title')}
          </h1>
        </div>
        <div class="flex flex-wrap items-center gap-x-2 gap-y-2">
          {#if isBeta}
            <a
              href={STABLE_URL}
              onclick={() => track('channel_switch_clicked', { from: 'beta', to: 'stable' })}
              class="rounded-full bg-surface/80 px-2 py-0.5 font-mono text-xs text-beta-content ring-1 ring-beta-edge/60 transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-beta-edge"
            >
              {$_('beta.stable_link')}
            </a>
          {:else}
            <a
              href={BETA_URL}
              onclick={() => track('channel_switch_clicked', { from: 'stable', to: 'beta' })}
              class="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-rose-700 transition-colors hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-800"
            >
              {$_('beta.try_link')}
            </a>
          {/if}
          <button
            type="button"
            onclick={openChangelog}
            class="relative rounded-full bg-surface-muted/80 px-2 py-0.5 font-mono text-xs text-brand/90 ring-1 ring-edge/60 transition-colors hover:bg-surface hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            v{version}
            <span class="sr-only"
              >{hasNewChangelog ? $_('header.changelog_sr_new') : $_('header.changelog_sr')}</span
            >
            {#if hasNewChangelog}
              <span
                aria-hidden="true"
                class="absolute -top-2.5 -left-3 -rotate-12 rounded-full bg-orange-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-white"
              >
                New
              </span>
            {/if}
          </button>
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      <nav
        class="mx-auto mt-3 flex w-full max-w-6xl px-4 pb-3 sm:mt-4 sm:px-6 sm:pb-4"
        aria-label="Sections"
      >
        <div class="flex flex-wrap gap-1.5 sm:gap-2" data-tutorial="nav">
          {#each tabs as tab (tab.route)}
            {@const active = path === tab.route}
            <a
              href={resolve(tab.route)}
              class={[
                TAB_PILL_CLASS,
                active
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-surface-muted text-content hover:text-content-strong',
              ]}
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
              {#if tab.wip}
                <span
                  class={[
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    active ? 'bg-white/25 text-white' : 'bg-surface-sunken text-warn',
                  ]}
                >
                  WIP
                </span>
              {/if}
            </a>
          {/each}
        </div>
      </nav>
    </header>

    <div class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      {@render children()}
    </div>

    <Footer />
  </div>
</main>

<ChangelogDialog bind:open={changelogOpen} onClose={() => (changelogOpen = false)} />
<BulkModals />
<RestoreSessionModal />
<Lightbox />
<Toaster />
