<script lang="ts">
  import { track } from './analytics';
  import { getTheme, toggleTheme } from './theme.svelte';

  const theme = $derived(getTheme());
  const isDark = $derived(theme === 'dark');

  function onClick(): void {
    const next = isDark ? 'light' : 'dark';
    track('theme_changed', { from: theme, to: next });
    toggleTheme();
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={isDark}
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  onclick={onClick}
  class="grid h-7 w-7 place-items-center rounded-full bg-surface-muted/80 text-brand/90 ring-1 ring-edge/60 transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
>
  {#if isDark}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1"
      />
    </svg>
  {:else}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  {/if}
</button>
