<script lang="ts">
  import { resolve } from '$app/paths';
  import { PUBLIC_SITE_URL } from '$env/static/public';
  import { _ } from 'svelte-i18n';
  import Card from '$lib/Card.svelte';
  import FileDropZone from '$lib/FileDropZone.svelte';
  import { getSave } from '$lib/saveFile.svelte';

  const pills = $derived([
    {
      kind: 'player' as const,
      href: resolve('/player'),
      label: $_('tab.player'),
      save: getSave('player'),
    },
    { kind: 'mii' as const, href: resolve('/mii'), label: $_('tab.mii'), save: getSave('mii') },
    { kind: 'map' as const, href: resolve('/map'), label: $_('tab.map'), save: getSave('map') },
  ]);
</script>

<svelte:head>
  <title>Tomodachi Life: Living the Dream - Save Editor</title>
  <link rel="canonical" href="{PUBLIC_SITE_URL}/" />
  <meta property="og:title" content="Tomodachi Life: Living the Dream - Save Editor" />
  <meta property="og:description" content="Save editor for Tomodachi Life: Living the Dream." />
  <meta property="og:url" content="{PUBLIC_SITE_URL}/" />
  <meta name="twitter:title" content="Tomodachi Life: Living the Dream - Save Editor" />
  <meta name="twitter:description" content="Save editor for Tomodachi Life: Living the Dream." />
</svelte:head>

<div class="grid grid-cols-1 gap-6">
  <header class="min-w-0">
    <h2 class="text-2xl font-bold tracking-tight text-content-strong">{$_('home.title')}</h2>
    <p class="mt-1 text-sm text-content">{$_('home.description')}</p>
  </header>

  <Card>
    <FileDropZone />
  </Card>

  <ul class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    {#each pills as pill (pill.kind)}
      <li>
        <a
          href={pill.href}
          class="flex h-full flex-col gap-1 rounded-2xl bg-surface px-4 py-3 shadow-sm ring-1 ring-edge/40 transition-colors hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
        >
          <span class="text-sm font-bold text-content-strong">{pill.label}</span>
          {#if pill.save}
            <span class="truncate font-mono text-xs text-content">{pill.save.name}</span>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-orange-600">
              {$_('home.loaded')}
            </span>
          {:else}
            <span class="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
              {$_('home.not_loaded')}
            </span>
          {/if}
        </a>
      </li>
    {/each}
  </ul>
</div>
