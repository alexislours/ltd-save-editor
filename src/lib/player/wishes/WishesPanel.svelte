<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { track } from '$lib/analytics';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import { PLAYER_SCHEMA } from '$lib/sav/schema';
  import { enumOptionName } from '$lib/sav/knownKeys';
  import { allWishes, wishLabel, type Wish } from '$lib/sav/lists/wishList.svelte';
  import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
  import { CARD_CLASS, INPUT_CLASS, PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import {
    applyLiberatedToWishes,
    bumpStatsToSatisfy,
    getComeTrueCount,
    getFountainLevel,
    liberatedWishHashes,
    setWishLiberated,
    wishesAvailable,
  } from './wishHelpers';

  const ui = $derived($locale);
  const acc = $derived(playerAccessor());
  const available = $derived(wishesAvailable(acc));

  const currentFountainLevel = $derived.by(() => {
    if (!acc) return null;
    const leaf = PLAYER_SCHEMA.Liberation.FountainLevel;
    if (!acc.has(leaf)) return null;
    return acc.get(leaf) as number;
  });

  const activeSeasons = $derived.by(() => {
    if (!acc) return [] as string[];
    const leaf = PLAYER_SCHEMA.Liberation.SeasonInfo.SeasonIdValue;
    if (!acc.has(leaf)) return [] as string[];
    const ids = acc.get(leaf) as number[];
    const out: string[] = [];
    for (const id of ids) {
      const name = enumOptionName(id >>> 0);
      if (name && !out.includes(name)) out.push(name);
    }
    return out;
  });

  let query = $state('');
  let categoryFilter = $state<'all' | Wish['category']>('all');

  const wishes = $derived(allWishes());

  const categories = $derived.by(() => {
    const seen: Wish['category'][] = [];
    for (const w of wishes) {
      if (!seen.includes(w.category)) seen.push(w.category);
    }
    return seen.sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  });

  const filtered = $derived.by(() => {
    const q = query.trim().toLocaleLowerCase();
    const sorted = [...wishes].sort((a, b) => {
      const an = wishLabel(a, ui).toLocaleLowerCase();
      const bn = wishLabel(b, ui).toLocaleLowerCase();
      if (a.category !== b.category) return a.category < b.category ? -1 : 1;
      if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
    return sorted.filter((w) => {
      if (categoryFilter !== 'all' && w.category !== categoryFilter) return false;
      if (!q) return true;
      const haystack = [wishLabel(w, ui), w.name, w.category, w.jp ?? '']
        .join('\n')
        .toLocaleLowerCase();
      return haystack.includes(q);
    });
  });

  const liberatedSet = $derived(liberatedWishHashes(acc));
  const liberatedCount = $derived(liberatedSet.size);

  function unmetMaxStats(targets: Wish[]): { level: number | null; count: number | null } {
    const currentLevel = getFountainLevel(acc);
    const currentCount = getComeTrueCount(acc);
    let maxLevel: number | null = null;
    let maxCount: number | null = null;
    for (const w of targets) {
      if (
        w.fountainLevel != null &&
        currentLevel != null &&
        currentLevel < w.fountainLevel &&
        (maxLevel == null || w.fountainLevel > maxLevel)
      ) {
        maxLevel = w.fountainLevel;
      }
      if (
        w.liftComeTrueCount != null &&
        currentCount != null &&
        currentCount < w.liftComeTrueCount &&
        (maxCount == null || w.liftComeTrueCount > maxCount)
      ) {
        maxCount = w.liftComeTrueCount;
      }
    }
    return { level: maxLevel, count: maxCount };
  }

  let bumpOpen = $state(false);
  let bumpLevel = $state<number | null>(null);
  let bumpCount = $state<number | null>(null);

  let bulkOpen = $state(false);
  let pendingBulkValue = $state<boolean | null>(null);

  const bumpBody = $derived.by(() => {
    if (bumpLevel != null && bumpCount != null) {
      return $_('player.wishes.bump.both', {
        values: { level: bumpLevel, count: bumpCount },
      });
    }
    if (bumpLevel != null) {
      return $_('player.wishes.bump.level', { values: { level: bumpLevel } });
    }
    if (bumpCount != null) {
      return $_('player.wishes.bump.count', { values: { count: bumpCount } });
    }
    return '';
  });

  function maybeOfferBump(targets: Wish[]): void {
    const { level, count } = unmetMaxStats(targets);
    if (level == null && count == null) return;
    bumpLevel = level;
    bumpCount = count;
    bumpOpen = true;
  }

  function confirmBump(): void {
    bumpStatsToSatisfy(acc, bumpLevel, bumpCount);
    track('wish_stats_bumped', { level: bumpLevel, count: bumpCount });
    bumpLevel = null;
    bumpCount = null;
  }

  function cancelBump(): void {
    bumpLevel = null;
    bumpCount = null;
  }

  function onToggle(wish: Wish, value: boolean): void {
    setWishLiberated(acc, wish.hash, value);
    if (value) maybeOfferBump([wish]);
  }

  function bulkApply(value: boolean): void {
    if (filtered.length === 0) return;
    pendingBulkValue = value;
    bulkOpen = true;
  }

  function confirmBulk(): void {
    const value = pendingBulkValue;
    pendingBulkValue = null;
    if (value == null) return;
    const targets = filtered;
    applyLiberatedToWishes(
      acc,
      targets.map((w) => w.hash),
      value,
    );
    track('bulk_edit', { field: 'wish_liberated', count: targets.length });
    if (value) maybeOfferBump(targets);
  }

  function cancelBulk(): void {
    pendingBulkValue = null;
  }

  function categoryLabel(c: Wish['category']): string {
    return $_(`player.wishes.category.${c}`, { default: c });
  }

  function seasonLabel(season: NonNullable<Wish['liftSeason']>): string {
    return $_(`player.wishes.season.${season}`, { default: season });
  }

  type Gate =
    | { kind: 'level'; required: number; ok: boolean | null }
    | { kind: 'count'; required: number }
    | { kind: 'season'; season: NonNullable<Wish['liftSeason']>; ok: boolean | null };

  function gatesFor(wish: Wish): Gate[] {
    const out: Gate[] = [];
    if (wish.fountainLevel != null) {
      const ok = currentFountainLevel == null ? null : currentFountainLevel >= wish.fountainLevel;
      out.push({ kind: 'level', required: wish.fountainLevel, ok });
    }
    if (wish.liftComeTrueCount != null) {
      out.push({ kind: 'count', required: wish.liftComeTrueCount });
    }
    if (wish.liftSeason) {
      const ok = activeSeasons.length === 0 ? null : activeSeasons.includes(wish.liftSeason);
      out.push({ kind: 'season', season: wish.liftSeason, ok });
    }
    return out;
  }
</script>

{#if !available}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.wishes.missing')}</p>
  </section>
{:else if wishes.length === 0}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.wishes.loading')}</p>
  </section>
{:else}
  <section class={CARD_CLASS}>
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-content-strong">{$_('player.wishes.heading')}</h3>
        <p class="text-xs text-content-muted">
          {$_('player.wishes.caption', {
            values: { liberated: liberatedCount, total: wishes.length },
          })}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 text-[11px] text-content-muted">
        {#if currentFountainLevel != null}
          <span class="rounded-full bg-surface-sunken px-2 py-[2px] font-semibold">
            {$_('player.wishes.player_level', { values: { level: currentFountainLevel } })}
          </span>
        {/if}
        {#if activeSeasons.length > 0}
          {#each activeSeasons as s (s)}
            <span class="rounded-full bg-surface-sunken px-2 py-[2px] font-semibold">
              {seasonLabel(s as NonNullable<Wish['liftSeason']>)}
            </span>
          {/each}
        {/if}
      </div>
    </header>

    <div class="mt-4 flex flex-wrap items-end gap-3">
      <label class="block min-w-0 flex-1">
        <span class="block text-xs font-bold text-content">{$_('player.wishes.search')}</span>
        <input
          type="search"
          class="{INPUT_CLASS} mt-1 w-full"
          placeholder={$_('player.wishes.search_placeholder')}
          value={query}
          oninput={(e) => (query = e.currentTarget.value)}
        />
      </label>
      <label class="block">
        <span class="block text-xs font-bold text-content"
          >{$_('player.wishes.category_label')}</span
        >
        <select
          class="{INPUT_CLASS} mt-1"
          value={categoryFilter}
          onchange={(e) => (categoryFilter = e.currentTarget.value as 'all' | Wish['category'])}
        >
          <option value="all">{$_('player.wishes.category_all')}</option>
          {#each categories as c (c)}
            <option value={c}>{categoryLabel(c)}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class={PILL_BUTTON_CLASS}
        disabled={filtered.length === 0}
        onclick={() => bulkApply(true)}
      >
        {$_('player.wishes.bulk_liberate', { values: { count: filtered.length } })}
      </button>
      <button
        type="button"
        class={PILL_BUTTON_CLASS}
        disabled={filtered.length === 0}
        onclick={() => bulkApply(false)}
      >
        {$_('player.wishes.bulk_reset', { values: { count: filtered.length } })}
      </button>
    </div>

    <div
      class="@container mt-2 max-h-160 overflow-y-auto rounded-xl border border-edge/40 bg-surface-muted/40"
    >
      {#if filtered.length === 0}
        <p class="p-6 text-sm text-content-muted">{$_('player.wishes.empty')}</p>
      {:else}
        <ul class="divide-y divide-edge/40">
          {#each filtered as wish (wish.hash)}
            {@const liberated = liberatedSet.has(wish.hash)}
            {@const gates = gatesFor(wish)}
            <li
              class="wish-row flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-sunken/30"
            >
              <input
                id={`wish-${wish.hash}`}
                type="checkbox"
                class="h-4 w-4 shrink-0 accent-orange-500"
                checked={liberated}
                onchange={(e) => onToggle(wish, e.currentTarget.checked)}
              />
              <label for={`wish-${wish.hash}`} class="min-w-0 flex-1 cursor-pointer">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate text-sm font-bold text-content-strong">
                    {wishLabel(wish, ui)}
                  </span>
                  {#each gates as gate (gate.kind + ('season' in gate ? gate.season : ''))}
                    <span
                      class="rounded-full px-2 py-[1px] text-[10px] font-semibold {gate.kind !==
                        'count' && gate.ok === false
                        ? 'bg-danger-bg text-danger'
                        : gate.kind !== 'count' && gate.ok === true
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-surface-sunken text-content'}"
                      title={gate.kind === 'level'
                        ? $_('player.wishes.gate.level_tip', {
                            values: { level: gate.required },
                          })
                        : gate.kind === 'count'
                          ? $_('player.wishes.gate.count_tip', {
                              values: { count: gate.required },
                            })
                          : $_('player.wishes.gate.season_tip', {
                              values: { season: seasonLabel(gate.season) },
                            })}
                    >
                      {#if gate.kind === 'level'}
                        {$_('player.wishes.gate.level', { values: { level: gate.required } })}
                      {:else if gate.kind === 'count'}
                        {$_('player.wishes.gate.count', { values: { count: gate.required } })}
                      {:else}
                        {seasonLabel(gate.season)}
                      {/if}
                    </span>
                  {/each}
                </div>
                <div class="truncate font-mono text-[11px] text-content-faint">
                  <span
                    class="mr-2 inline-block rounded-full bg-surface-sunken px-2 py-[1px] text-[10px] font-semibold text-content"
                  >
                    {categoryLabel(wish.category)}
                  </span>
                  {wish.name}
                </div>
              </label>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </section>
{/if}

<ConfirmDialog
  bind:open={bulkOpen}
  title={$_('player.wishes.bulk_confirm_title')}
  body={$_('player.wishes.bulk_confirm', { values: { count: filtered.length } })}
  confirmLabel={$_('player.wishes.bulk_confirm_apply')}
  onConfirm={confirmBulk}
  onCancel={cancelBulk}
/>

<ConfirmDialog
  bind:open={bumpOpen}
  title={$_('player.wishes.bump.title')}
  body={bumpBody}
  confirmLabel={$_('player.wishes.bump.apply')}
  cancelLabel={$_('player.wishes.bump.skip')}
  onConfirm={confirmBump}
  onCancel={cancelBump}
/>

<style>
  .wish-row {
    content-visibility: auto;
    contain-intrinsic-size: 60px auto;
  }
</style>
