<script lang="ts">
  import type { Snippet } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { CHANGELOG } from './changelog';
  import ChangelogDialog from './ChangelogDialog.svelte';
  import Lightbox from './Lightbox.svelte';
  import LocaleSwitcher from './LocaleSwitcher.svelte';
  import { getPath, navigate } from './navigation.svelte';
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

  function openChangelog(): void {
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
      class="bg-rose-600 px-6 py-2 text-center text-sm font-semibold text-white shadow-md"
    >
      {$_('beta.warning')}
    </div>
  {/if}
  <header
    class={[
      'shadow-sm',
      isBeta
        ? 'bg-rose-300/90 ring-1 ring-rose-500/70'
        : 'bg-amber-300/90 ring-1 ring-amber-400/60',
    ]}
  >
    <div class="mx-auto flex w-full max-w-5xl items-start justify-between gap-4 px-6 pt-6">
      <div>
        <p
          class={[
            'text-xs font-bold uppercase tracking-[0.18em]',
            isBeta ? 'text-rose-800' : 'text-orange-700/90',
          ]}
        >
          {$_('app.title')}{#if isBeta}<span
              class="ml-2 inline-block rounded bg-rose-700 px-1.5 py-0.5 text-[10px] tracking-[0.2em] text-white"
              >{$_('beta.badge')}</span
            >{/if}
        </p>
        <h1 class="mt-0.5 text-xl font-bold text-slate-900">{$_('app.game_title')}</h1>
      </div>
      <div class="flex items-center gap-2">
        {#if isBeta}
          <a
            href={STABLE_URL}
            class="rounded-full bg-rose-50/80 px-2 py-0.5 font-mono text-xs text-rose-800 ring-1 ring-rose-500/60 transition-colors hover:bg-white hover:text-rose-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
          >
            {$_('beta.stable_link')}
          </a>
        {:else}
          <a
            href={BETA_URL}
            class="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-rose-700 transition-colors hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-800"
          >
            {$_('beta.try_link')}
          </a>
        {/if}
        <button
          type="button"
          onclick={openChangelog}
          aria-label={hasNewChangelog ? 'Show changelog (new updates)' : 'Show changelog'}
          class="relative rounded-full bg-amber-50/80 px-2 py-0.5 font-mono text-xs text-orange-700/90 ring-1 ring-amber-400/60 transition-colors hover:bg-white hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
        >
          v{__APP_VERSION__}
          {#if hasNewChangelog}
            <span class="sr-only">— new updates available</span>
            <span
              aria-hidden="true"
              class="absolute -top-2.5 -left-3 -rotate-12 rounded-full bg-orange-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-white"
            >
              New
            </span>
          {/if}
        </button>
        <LocaleSwitcher />
      </div>
    </div>

    <nav class="mx-auto mt-4 flex w-full max-w-5xl flex-wrap gap-2 px-6 pb-4" aria-label="Sections">
      {#each tabs as tab (tab.href)}
        {@const active = path === tab.href}
        <a
          href={tab.href}
          onclick={(e) => go(tab.href, e)}
          class={[
            TAB_PILL_CLASS,
            active
              ? 'bg-orange-500 text-white shadow'
              : 'bg-amber-50 text-slate-700 hover:text-slate-900',
          ]}
          aria-current={active ? 'page' : undefined}
        >
          {tab.label}
          {#if tab.wip}
            <span
              class={[
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                active ? 'bg-white/25 text-white' : 'bg-amber-200 text-amber-800',
              ]}
            >
              WIP
            </span>
          {/if}
        </a>
      {/each}
    </nav>
  </header>

  <div class="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
    {@render children()}
  </div>
</div>

<ChangelogDialog bind:open={changelogOpen} onClose={() => (changelogOpen = false)} />
<Lightbox />
