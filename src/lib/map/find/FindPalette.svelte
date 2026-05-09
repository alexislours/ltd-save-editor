<script lang="ts">
  import { tick } from 'svelte';
  import { _ } from 'svelte-i18n';
  import {
    close,
    cycleSnap,
    commitToSelection,
    findParsed,
    findStore,
    next,
    prev,
    setQuery,
  } from './findStore.svelte';

  let inputEl: HTMLInputElement | undefined = $state();
  let prevFocus: HTMLElement | null = null;

  const parsed = $derived(findParsed());

  const prefixChip = $derived.by(() => {
    if (parsed.kind === 'tile') return 'tile';
    if (parsed.kind === 'actor') return 'actor';
    if (parsed.kind === 'unknown') return 'unknown';
    if (parsed.kind === 'link') return 'link';
    if (parsed.kind === 'ugc') return 'ugc';
    return null;
  });

  $effect(() => {
    if (!findStore.open) return;
    prevFocus = (document.activeElement as HTMLElement) ?? null;
    void tick().then(() => inputEl?.focus());
    function onWindowKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        inputEl?.focus();
      }
    }
    window.addEventListener('keydown', onWindowKey, true);
    return () => {
      window.removeEventListener('keydown', onWindowKey, true);
      prevFocus?.focus?.();
      prevFocus = null;
    };
  });

  function onInput(e: Event): void {
    setQuery((e.currentTarget as HTMLInputElement).value);
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      commitToSelection(e.shiftKey ? 'union' : 'replace');
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      cycleSnap(e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      next();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      prev();
      return;
    }
  }
</script>

{#if findStore.open}
  <div
    class="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center"
    role="dialog"
    aria-modal="true"
    aria-label={$_('map.find.aria')}
  >
    <div
      class="pointer-events-auto flex w-[min(560px,80%)] items-center gap-2 rounded-2xl bg-surface/95 px-3 py-2 shadow-2xl ring-1 ring-edge/60 backdrop-blur-md"
    >
      {#if prefixChip}
        <span
          class="shrink-0 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold text-orange-700"
        >
          {prefixChip}
        </span>
      {/if}
      <input
        bind:this={inputEl}
        type="text"
        value={findStore.query}
        oninput={onInput}
        onkeydown={onKeyDown}
        placeholder={$_('map.find.placeholder')}
        class="min-w-0 flex-1 bg-transparent px-1 text-base text-content-strong placeholder:text-content-muted focus:outline-none"
      />
      <span class="shrink-0 font-mono text-[11px] text-content-faint">esc</span>
    </div>
  </div>
{/if}
