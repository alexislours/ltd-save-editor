<script lang="ts" generics="T">
  import { _, locale } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS, PILL_BUTTON_CLASS } from '../styles';
  import { miiState } from './miiEditor.svelte';
  import type { BitmaskAccess } from './ownershipBitmask';

  type Props = {
    selectedIndex: number | null;
    items: readonly T[];
    bitmask: BitmaskAccess;
    keyFor: (item: T) => string | number;
    indexFor: (item: T) => number;
    labelFor: (item: T, ui: string | null | undefined) => string;
    nameFor: (item: T) => string;
    colorCountFor: (item: T) => number;
    imageUrlFor: (item: T, colorIndex: number) => string;
    subtitleFor?: (item: T, ui: string | null | undefined) => string;
    categoryOf?: (item: T) => string;
    heading: string;
    caption: string;
    summaryFor: (items: number, total: number) => string;
  };

  let {
    selectedIndex,
    items,
    bitmask,
    keyFor,
    indexFor,
    labelFor,
    nameFor,
    colorCountFor,
    imageUrlFor,
    subtitleFor,
    categoryOf,
    heading,
    caption,
    summaryFor,
  }: Props = $props();

  const tick = $derived(miiState.tick);
  const ui = $derived($locale);

  let search = $state('');
  let filter = $state<'all' | 'owned' | 'unowned'>('owned');
  let category = $state<string>('all');

  const sorted = $derived.by(() => {
    return [...items].sort((a, b) => {
      const an = labelFor(a, ui).toLocaleLowerCase();
      const bn = labelFor(b, ui).toLocaleLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  });

  const categories = $derived.by(() => {
    if (!categoryOf) return [] as string[];
    const set = new SvelteSet<string>();
    for (const item of items) set.add(categoryOf(item));
    return ['all', ...[...set].sort((a, b) => a.localeCompare(b))];
  });

  type Row = {
    item: T;
    mask: number;
    ownedCount: number;
    validMask: number;
    colorCount: number;
  };

  const rows = $derived.by<Row[]>(() => {
    void tick;
    if (selectedIndex == null) return [];
    const out: Row[] = [];
    for (const item of sorted) {
      const colorCount = colorCountFor(item);
      const validMask = bitmask.validMask(colorCount);
      const mask = bitmask.read(indexFor(item)) & validMask;
      const ownedCount = bitmask.popcount(mask);
      out.push({ item, mask, ownedCount, validMask, colorCount });
    }
    return out;
  });

  const ownedTotal = $derived(rows.reduce((s, r) => s + r.ownedCount, 0));
  const ownedItems = $derived(rows.filter((r) => r.ownedCount > 0).length);

  const visibleRows = $derived.by(() => {
    const q = search.trim().toLocaleLowerCase();
    return rows.filter((r) => {
      if (filter === 'owned' && r.ownedCount === 0) return false;
      if (filter === 'unowned' && r.ownedCount > 0) return false;
      if (categoryOf && category !== 'all' && categoryOf(r.item) !== category) return false;
      if (
        q &&
        !labelFor(r.item, ui).toLocaleLowerCase().includes(q) &&
        !nameFor(r.item).toLocaleLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  });

  function clearAll(): void {
    if (selectedIndex == null) return;
    for (const r of rows) {
      if (r.mask !== 0) bitmask.write(indexFor(r.item), 0);
    }
  }

  function clearVisible(): void {
    if (selectedIndex == null) return;
    for (const r of visibleRows) {
      if (r.mask !== 0) bitmask.write(indexFor(r.item), 0);
    }
  }
</script>

<section class={CARD_CLASS}>
  <div class="flex flex-wrap items-start justify-between gap-2">
    <div class="min-w-0">
      <h3 class="text-base font-bold text-content-strong">{heading}</h3>
      <p class="mt-0.5 text-xs text-content-muted">{caption}</p>
    </div>
    <span class="font-mono text-xs text-content-muted whitespace-nowrap">
      {summaryFor(ownedItems, ownedTotal)}
    </span>
  </div>

  <div
    class="mt-4 grid gap-3"
    class:sm:grid-cols-[1fr_auto_auto]={!!categoryOf}
    class:sm:grid-cols-[1fr_auto]={!categoryOf}
  >
    <label class="block min-w-0">
      <span class={LABEL_CLASS}>{$_('mii.belongings.search_label')}</span>
      <input
        type="text"
        class={FORM_INPUT_CLASS}
        placeholder={$_('mii.belongings.search_placeholder')}
        value={search}
        oninput={(e) => (search = e.currentTarget.value)}
      />
    </label>
    <label class="block min-w-0">
      <span class={LABEL_CLASS}>{$_('mii.belongings.filter_label')}</span>
      <select
        class={FORM_INPUT_CLASS}
        value={filter}
        onchange={(e) => {
          const v = e.currentTarget.value;
          filter = v === 'owned' || v === 'unowned' ? v : 'all';
        }}
      >
        <option value="all">{$_('mii.belongings.filter_all')}</option>
        <option value="owned">{$_('mii.belongings.filter_owned')}</option>
        <option value="unowned">{$_('mii.belongings.filter_unowned')}</option>
      </select>
    </label>
    {#if categoryOf}
      <label class="block min-w-0">
        <span class={LABEL_CLASS}>{$_('mii.belongings.category_label')}</span>
        <select
          class={FORM_INPUT_CLASS}
          value={category}
          onchange={(e) => (category = e.currentTarget.value)}
        >
          {#each categories as cat (cat)}
            <option value={cat}>
              {cat === 'all' ? $_('mii.belongings.category_all') : cat}
            </option>
          {/each}
        </select>
      </label>
    {/if}
  </div>

  <div class="mt-3 flex flex-wrap gap-1.5">
    <button type="button" class={PILL_BUTTON_CLASS} onclick={clearVisible}>
      {$_('mii.belongings.clear_visible_action')}
    </button>
    <button type="button" class={PILL_BUTTON_CLASS} onclick={clearAll}>
      {$_('mii.belongings.clear_all_action')}
    </button>
  </div>

  <div
    class="mt-4 max-h-[36rem] overflow-y-auto rounded-md border border-edge/40 bg-surface-muted p-2"
  >
    {#if visibleRows.length === 0}
      <p class="p-2 text-xs text-content-muted">{$_('mii.belongings.no_results')}</p>
    {:else}
      <ul class="grid gap-1.5">
        {#each visibleRows as row (keyFor(row.item))}
          {@const label = labelFor(row.item, ui)}
          {@const subtitle = subtitleFor ? subtitleFor(row.item, ui) : nameFor(row.item)}
          <li
            class="cloth-row rounded-lg bg-surface-sunken/40 p-2 ring-1 ring-edge/30"
            class:owned={row.ownedCount > 0}
          >
            <div class="flex items-start gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface"
                class:opacity-50={row.ownedCount === 0}
              >
                <img
                  src={imageUrlFor(row.item, 0)}
                  alt={label}
                  loading="lazy"
                  class="h-full w-full object-contain p-1"
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-baseline gap-2">
                  <span class="text-sm font-bold text-content-strong">{label}</span>
                  <span class="font-mono text-[10px] text-content-faint">{subtitle}</span>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  <span class="text-[11px] text-content-muted">
                    {$_('mii.belongings.colors_owned', {
                      values: { owned: row.ownedCount, total: row.colorCount },
                    })}
                  </span>
                  <button
                    type="button"
                    class="rounded border border-edge/50 px-1.5 py-0.5 text-[10px] font-bold text-content-muted hover:bg-surface-sunken hover:text-content-strong"
                    onclick={() => bitmask.setAllColors(indexFor(row.item), true, row.colorCount)}
                    title={$_('mii.belongings.give_all_colors_tip')}
                  >
                    {$_('mii.belongings.give_all_colors_action')}
                  </button>
                  <button
                    type="button"
                    class="rounded border border-edge/50 px-1.5 py-0.5 text-[10px] font-bold text-content-muted hover:bg-surface-sunken hover:text-content-strong"
                    onclick={() => bitmask.setAllColors(indexFor(row.item), false, row.colorCount)}
                    title={$_('mii.belongings.clear_all_colors_tip')}
                  >
                    {$_('mii.belongings.clear_all_colors_action')}
                  </button>
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  {#each Array.from({ length: row.colorCount }, (_v, ci) => ci) as ci (ci)}
                    {@const owned = ((row.mask >>> ci) & 1) === 1}
                    <button
                      type="button"
                      class="color-chip flex h-9 w-9 items-center justify-center overflow-hidden rounded border-2 transition-all"
                      class:owned-chip={owned}
                      aria-pressed={owned}
                      title={`${label} #${ci + 1}${owned ? ' ✓' : ''}`}
                      onclick={() => bitmask.toggleColor(indexFor(row.item), ci, !owned)}
                    >
                      <img
                        src={imageUrlFor(row.item, ci)}
                        alt=""
                        loading="lazy"
                        class="h-full w-full object-contain p-0.5"
                        class:opacity-30={!owned}
                      />
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<style>
  .cloth-row {
    content-visibility: auto;
    contain-intrinsic-size: 96px auto;
  }
  .color-chip {
    border-color: var(--color-edge, rgba(0, 0, 0, 0.15));
    background: var(--color-surface, transparent);
  }
  .color-chip.owned-chip {
    border-color: rgb(249 115 22);
    box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.4);
  }
</style>
