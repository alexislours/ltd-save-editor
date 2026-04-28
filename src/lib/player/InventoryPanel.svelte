<script lang="ts">
  import type { Snippet } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { CARD_CLASS, INPUT_CLASS } from '../styles';
  import BulkEditPanel from './BulkEditPanel.svelte';

  type Props = {
    available: boolean;
    missingMessage: string;
    heading: string;
    caption: string;
    query: string;
    setQuery: (value: string) => void;
    visibleCount: number;
    emptyMessage: string;
    bulkHasState: boolean;
    bulkHasQty: boolean;
    onApplyState: (value: number) => void;
    onApplyQty: (value: number) => void;
    note?: string;
    rows: Snippet;
  };

  let {
    available,
    missingMessage,
    heading,
    caption,
    query,
    setQuery,
    visibleCount,
    emptyMessage,
    bulkHasState,
    bulkHasQty,
    onApplyState,
    onApplyQty,
    note,
    rows,
  }: Props = $props();
</script>

{#if !available}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{missingMessage}</p>
  </section>
{:else}
  <section class={CARD_CLASS}>
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-content-strong">{heading}</h3>
        <p class="text-xs text-content-muted">{caption}</p>
      </div>
    </header>

    <div class="mt-4">
      <label class="block">
        <span class="block text-xs font-bold text-content">{$_('player.inventory.search')}</span>
        <input
          type="search"
          class="{INPUT_CLASS} mt-1 w-full"
          placeholder={$_('player.inventory.search_placeholder')}
          value={query}
          oninput={(e) => setQuery(e.currentTarget.value)}
        />
      </label>
    </div>

    <div class="mt-3">
      <BulkEditPanel
        {visibleCount}
        hasState={bulkHasState}
        hasQty={bulkHasQty}
        {onApplyState}
        {onApplyQty}
      />
    </div>

    {#if note}
      <p class="mt-3 text-xs text-content-muted">{note}</p>
    {/if}

    <div
      class="{note
        ? 'mt-2'
        : 'mt-4'} @container max-h-160 overflow-y-auto rounded-xl border border-edge/40 bg-surface-muted/40"
    >
      {#if visibleCount === 0}
        <p class="p-6 text-sm text-content-muted">{emptyMessage}</p>
      {:else}
        <ul class="divide-y divide-edge/40">
          {@render rows()}
        </ul>
      {/if}
    </div>
  </section>
{/if}
