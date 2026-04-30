<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { dismissToast, getToasts } from './toast.svelte';

  const toasts = $derived(getToasts());
</script>

<div
  class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
  role="region"
  aria-label="Notifications"
  aria-live="polite"
>
  {#each toasts as t (t.id)}
    <div
      role={t.kind === 'error' ? 'alert' : 'status'}
      transition:fly={{ y: 16, duration: 220, easing: quintOut }}
      class={[
        'pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-full bg-surface px-4 py-2 text-sm shadow-lg ring-1 backdrop-blur-sm sm:w-auto',
        t.kind === 'success' && 'ring-emerald-500/40 text-content-strong',
        t.kind === 'error' && 'bg-danger-bg text-danger ring-danger-edge',
        t.kind === 'warn' && 'text-warn ring-amber-500/40',
        t.kind === 'info' && 'text-content-strong ring-edge/60',
      ]}
    >
      <span
        aria-hidden="true"
        class={[
          'grid h-5 w-5 shrink-0 place-items-center rounded-full',
          t.kind === 'success' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          t.kind === 'error' && 'bg-danger/15 text-danger',
          t.kind === 'warn' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
          t.kind === 'info' && 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
        ]}
      >
        {#if t.kind === 'success'}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-3 w-3"
          >
            <path d="M5 12l4.5 4.5L19 7" />
          </svg>
        {:else if t.kind === 'error'}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-3 w-3"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        {:else if t.kind === 'warn'}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-3 w-3"
          >
            <path d="M12 9v4M12 17h.01" />
          </svg>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-3 w-3"
          >
            <path d="M12 8v5M12 16h.01" />
          </svg>
        {/if}
      </span>
      <span class="min-w-0 flex-1 truncate font-medium">{t.text}</span>
      <button
        type="button"
        onclick={() => dismissToast(t.id)}
        aria-label="Dismiss"
        class="-mr-1 grid h-5 w-5 shrink-0 place-items-center rounded-full text-content-muted transition-colors hover:bg-surface-muted hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-3 w-3"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  {/each}
</div>
