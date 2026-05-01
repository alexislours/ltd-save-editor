<script lang="ts">
  import type { Snippet } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { track } from './analytics';
  import { cancelOverwrite, confirmOverwrite, overwriteModal } from './bulkLoader.svelte';
  import { CHANGELOG } from './changelog';
  import ChangelogDialog from './ChangelogDialog.svelte';
  import { cancelClearAll, clearAllModal, confirmClearAll } from './clearAll.svelte';
  import ConfirmListModal from './ConfirmListModal.svelte';
  import Footer from './Footer.svelte';
  import Lightbox from './Lightbox.svelte';
  import LocaleSwitcher from './LocaleSwitcher.svelte';
  import { getPath, navigate } from './navigation.svelte';
  import RestoreSessionModal from './RestoreSessionModal.svelte';
  import { bootRestoreScan } from './sessionRestore.svelte';
  import { flushAllPending } from './sessionPersist';
  import ThemeSwitcher from './ThemeSwitcher.svelte';
  import Toaster from './Toaster.svelte';
  import { TAB_PILL_CLASS } from './styles';

  type Props = { children: Snippet };
  let { children }: Props = $props();

  const BETA_URL = 'https://beta.ltd-save-editor.pages.dev';
  const STABLE_URL = 'https://ltd-save-editor.pages.dev';
  const isBeta =
    typeof window !== 'undefined' && window.location.hostname === 'beta.ltd-save-editor.pages.dev';

  const path = $derived(getPath());
  let changelogOpen = $state(false);

  const LAST_SEEN_KEY = 'ltd-save-editor:last-seen-changelog-version';
  const latestVersion = CHANGELOG[0]?.version ?? '';
  let hasNewChangelog = $state(false);

  $effect(() => {
    if (typeof localStorage === 'undefined') return;
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    if (lastSeen === null) {
      localStorage.setItem(LAST_SEEN_KEY, latestVersion);
      return;
    }
    if (lastSeen !== latestVersion) hasNewChangelog = true;
  });

  $effect(() => {
    void bootRestoreScan();
    if (typeof window === 'undefined') return;
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_SEEN_KEY, latestVersion);
    }
  }

  const tabs = $derived([
    { href: '/player', label: $_('tab.player'), wip: false },
    { href: '/mii', label: $_('tab.mii'), wip: false },
    { href: '/map', label: $_('tab.map'), wip: false },
    { href: '/sharemii', label: $_('tab.sharemii'), wip: false },
    { href: '/ugc', label: $_('tab.ugc_editor'), wip: false },
    { href: '/faq', label: $_('tab.faq'), wip: false },
    { href: '/about', label: $_('tab.about'), wip: false },
  ]);

  function go(href: string, event: MouseEvent): void {
    event.preventDefault();
    navigate(href);
  }
</script>

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
          v{__APP_VERSION__}
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
      class="mx-auto mt-3 flex w-full max-w-6xl flex-wrap gap-1.5 px-4 pb-3 sm:mt-4 sm:gap-2 sm:px-6 sm:pb-4"
      aria-label="Sections"
    >
      {#each tabs as tab (tab.href)}
        {@const active = path === tab.href}
        <a
          href={tab.href}
          onclick={(e) => go(tab.href, e)}
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
    </nav>
  </header>

  <div class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
    {@render children()}
  </div>

  <Footer />
</div>

<ChangelogDialog bind:open={changelogOpen} onClose={() => (changelogOpen = false)} />
<ConfirmListModal
  bind:open={overwriteModal.open}
  items={overwriteModal.conflicts}
  title={$_('bulk.overwrite_title')}
  intro={$_('bulk.overwrite_intro')}
  warning={$_('bulk.overwrite_warning')}
  confirmLabel={$_('bulk.overwrite_confirm')}
  onConfirm={confirmOverwrite}
  onCancel={cancelOverwrite}
/>
<ConfirmListModal
  bind:open={clearAllModal.open}
  items={clearAllModal.items}
  title={$_('bulk.clear_title')}
  intro={$_('bulk.clear_intro')}
  warning={$_('bulk.clear_warning')}
  confirmLabel={$_('bulk.clear_confirm')}
  onConfirm={confirmClearAll}
  onCancel={cancelClearAll}
/>
<RestoreSessionModal />
<Lightbox />
<Toaster />
