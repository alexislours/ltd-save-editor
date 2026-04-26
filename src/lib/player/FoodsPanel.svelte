<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { markDirty, playerState } from '../playerEditor.svelte';
  import { arrGetEnum, arrGetInt, arrSetEnum, arrSetInt } from '../sav/codec';
  import { allFoods, type Food, foodImageUrl, foodLabel } from '../sav/foodList.svelte';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS, INPUT_CLASS } from '../styles';
  import BulkEditPanel from './BulkEditPanel.svelte';
  import InventoryRow from './InventoryRow.svelte';
  import { OBTAINED_HASH } from './stateOptions';

  type Props = { entries: Entry[] };
  let { entries }: Props = $props();

  const ui = $derived($locale);

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });

  const STATE_HASH = murmur3_x86_32('Player.FoodInfo.State') >>> 0;
  const OWN_NUM_HASH = murmur3_x86_32('Player.FoodInfo.OwnNum') >>> 0;

  const stateEntry = $derived(byHash.get(STATE_HASH) ?? null);
  const ownNumEntry = $derived(byHash.get(OWN_NUM_HASH) ?? null);

  let query = $state('');

  const sortedFoods = $derived.by(() => {
    const list = allFoods().filter((f) => f.id >= 0);
    return [...list].sort((a, b) => {
      const an = foodLabel(a, ui).toLocaleLowerCase();
      const bn = foodLabel(b, ui).toLocaleLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  });

  const visibleFoods = $derived.by(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return sortedFoods;
    return sortedFoods.filter(
      (f) =>
        foodLabel(f, ui).toLocaleLowerCase().includes(q) || f.name.toLocaleLowerCase().includes(q),
    );
  });

  function readState(food: Food): number {
    if (!stateEntry) return 0;
    void playerState.tick;
    try {
      return arrGetEnum(stateEntry, food.id);
    } catch {
      return 0;
    }
  }

  function readQty(food: Food): number {
    if (!ownNumEntry) return 0;
    void playerState.tick;
    try {
      return arrGetInt(ownNumEntry, food.id);
    } catch {
      return 0;
    }
  }

  function writeState(food: Food, value: number): void {
    if (!stateEntry) return;
    arrSetEnum(stateEntry, food.id, value >>> 0);
    markDirty(stateEntry);
  }

  function writeQty(food: Food, value: number): void {
    if (!ownNumEntry) return;
    const newQty = Math.max(0, Math.trunc(value));
    const prev = readQty(food);
    arrSetInt(ownNumEntry, food.id, newQty);
    markDirty(ownNumEntry);

    if (prev === 0 && newQty > 0 && stateEntry) {
      try {
        if (arrGetEnum(stateEntry, food.id) !== OBTAINED_HASH) {
          arrSetEnum(stateEntry, food.id, OBTAINED_HASH);
          markDirty(stateEntry);
        }
      } catch {
        /* out of range, skip */
      }
    }
  }

  function applyBulkState(value: number): void {
    if (!stateEntry) return;
    const v = value >>> 0;
    for (const f of visibleFoods) {
      try {
        arrSetEnum(stateEntry, f.id, v);
      } catch {
        /* out of range, skip */
      }
    }
    markDirty(stateEntry);
  }

  function applyBulkQty(value: number): void {
    if (!ownNumEntry) return;
    const v = Math.max(0, value);
    for (const f of visibleFoods) {
      try {
        arrSetInt(ownNumEntry, f.id, v);
        // Same auto-unlock rule as the per-row qty editor.
        if (v > 0 && stateEntry) {
          if (arrGetEnum(stateEntry, f.id) !== OBTAINED_HASH) {
            arrSetEnum(stateEntry, f.id, OBTAINED_HASH);
          }
        }
      } catch {
        /* out of range, skip */
      }
    }
    markDirty(ownNumEntry);
    if (v > 0 && stateEntry) markDirty(stateEntry);
  }
</script>

{#if !stateEntry && !ownNumEntry}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.foods.missing')}</p>
  </section>
{:else}
  <section class={CARD_CLASS}>
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-content-strong">{$_('player.foods.heading')}</h3>
        <p class="text-xs text-content-muted">
          {$_('player.foods.caption', { values: { count: visibleFoods.length } })}
        </p>
      </div>
    </header>

    <div class="mt-4">
      <label class="block">
        <span class="block text-xs font-bold text-content">{$_('player.inventory.search')}</span>
        <input
          type="search"
          class="{INPUT_CLASS} mt-1 w-full"
          placeholder={$_('player.inventory.search_placeholder')}
          bind:value={query}
        />
      </label>
    </div>

    <div class="mt-3">
      <BulkEditPanel
        visibleCount={visibleFoods.length}
        hasState={!!stateEntry}
        hasQty={!!ownNumEntry}
        onApplyState={applyBulkState}
        onApplyQty={applyBulkQty}
      />
    </div>

    <div
      class="mt-4 max-h-160 overflow-y-auto rounded-xl border border-edge/40 bg-surface-muted/40"
    >
      {#if visibleFoods.length === 0}
        <p class="p-6 text-sm text-content-muted">{$_('player.inventory.empty')}</p>
      {:else}
        <ul class="divide-y divide-edge/40">
          {#each visibleFoods as food (food.hash)}
            <InventoryRow
              imageUrl={foodImageUrl(food.textureId)}
              label={foodLabel(food, ui)}
              internalName={food.name}
              hasState={!!stateEntry}
              hasQty={!!ownNumEntry}
              state={readState(food)}
              qty={readQty(food)}
              onStateChange={(v) => writeState(food, v)}
              onQtyChange={(v) => writeQty(food, v)}
            />
          {/each}
        </ul>
      {/if}
    </div>
  </section>
{/if}
