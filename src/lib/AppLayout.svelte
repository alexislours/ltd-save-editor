<script lang="ts">
  import type { Snippet } from 'svelte';
  import { _ } from 'svelte-i18n';
  import ChangelogDialog from './ChangelogDialog.svelte';
  import LocaleSwitcher from './LocaleSwitcher.svelte';
  import { getPath, navigate } from './navigation.svelte';
  import { TAB_PILL_CLASS } from './styles';

  type Props = { children: Snippet };
  let { children }: Props = $props();

  const path = $derived(getPath());
  let changelogOpen = $state(false);

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
  <header class="bg-amber-300/90 shadow-sm ring-1 ring-amber-400/60">
    <div class="mx-auto flex w-full max-w-5xl items-start justify-between gap-4 px-6 pt-6">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-orange-700/90">
          {$_('app.title')}
        </p>
        <h1 class="mt-0.5 text-xl font-bold text-slate-900">{$_('app.game_title')}</h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={() => (changelogOpen = true)}
          aria-label="Show changelog"
          class="rounded-full bg-amber-50/80 px-2 py-0.5 font-mono text-xs text-orange-700/90 ring-1 ring-amber-400/60 transition-colors hover:bg-white hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
        >
          v{__APP_VERSION__}
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
