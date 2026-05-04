<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { _ } from 'svelte-i18n';

  const status = $derived(page.status);
  const isNotFound = $derived(status === 404);
  const titleKey = $derived(isNotFound ? 'error.not_found_title' : 'error.generic_title');
  const descriptionKey = $derived(
    isNotFound ? 'error.not_found_description' : 'error.generic_description',
  );
  const message = $derived(page.error?.message ?? '');
</script>

<svelte:head>
  <title>{$_(titleKey)} - Tomodachi Life: Living the Dream Save Editor</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
  <p
    class="font-mono text-[clamp(6rem,18vw,12rem)] font-black leading-none tracking-tighter text-orange-500"
    aria-hidden="true"
  >
    {status}
  </p>
  <h2 class="mt-2 text-2xl font-bold tracking-tight text-content-strong sm:text-3xl">
    {$_(titleKey)}
  </h2>
  <p class="mt-3 max-w-md text-sm text-content sm:text-base">
    {$_(descriptionKey)}
  </p>

  {#if !isNotFound && message}
    <p
      class="mt-4 max-w-md break-words rounded-lg border border-danger-edge bg-danger-bg px-3 py-2 font-mono text-xs text-danger"
    >
      {message}
    </p>
  {/if}

  <a
    href={resolve('/')}
    class="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow ring-1 ring-orange-600 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 active:scale-95"
  >
    <svg
      class="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
    {$_('error.back_home')}
  </a>
</div>
