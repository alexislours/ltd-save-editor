<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { markDirty, playerState } from '../playerEditor.svelte';
  import { arrayCount, arrGetEnum, arrGetInt, arrSetEnum, arrSetInt } from '../sav/codec';
  import { allCloths, type Cloth, CLOTH_COLOR_SLOTS, clothLabel } from '../sav/clothList.svelte';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS, INPUT_CLASS } from '../styles';
  import BulkEditPanel from './BulkEditPanel.svelte';
  import ClothRow from './ClothRow.svelte';
  import { OBTAINED_HASH } from './stateOptions';

  type Props = { entries: Entry[] };
  let { entries }: Props = $props();

  const ui = $derived($locale);

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });

  const STATE_HASH = murmur3_x86_32('Player.ClothInfo.OwnInfoArray.State') >>> 0;
  const OWN_NUM_HASH = murmur3_x86_32('Player.ClothInfo.OwnInfoArray.OwnNum') >>> 0;

  const stateEntry = $derived(byHash.get(STATE_HASH) ?? null);
  const ownNumEntry = $derived(byHash.get(OWN_NUM_HASH) ?? null);

  let query = $state('');

  const stateLen = $derived(stateEntry ? arrayCount(stateEntry) : 0);
  const ownNumLen = $derived(ownNumEntry ? arrayCount(ownNumEntry) : 0);

  function inRange(cloth: Cloth, len: number): boolean {
    return cloth.index >= 0 && cloth.index * CLOTH_COLOR_SLOTS < len;
  }

  const sortedCloths = $derived.by(() => {
    const max = Math.max(stateLen, ownNumLen);
    const list = allCloths().filter((c) => inRange(c, max));
    return [...list].sort((a, b) => {
      const an = clothLabel(a, ui).toLocaleLowerCase();
      const bn = clothLabel(b, ui).toLocaleLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  });

  const visibleCloths = $derived.by(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return sortedCloths;
    return sortedCloths.filter(
      (c) =>
        clothLabel(c, ui).toLocaleLowerCase().includes(q) || c.name.toLocaleLowerCase().includes(q),
    );
  });

  function slotIndex(cloth: Cloth, colorIndex: number): number {
    return cloth.index * CLOTH_COLOR_SLOTS + colorIndex;
  }

  function readState(cloth: Cloth, colorIndex: number): number {
    if (!stateEntry) return 0;
    void playerState.tick;
    try {
      return arrGetEnum(stateEntry, slotIndex(cloth, colorIndex));
    } catch {
      return 0;
    }
  }

  function readQty(cloth: Cloth, colorIndex: number): number {
    if (!ownNumEntry) return 0;
    void playerState.tick;
    try {
      return arrGetInt(ownNumEntry, slotIndex(cloth, colorIndex));
    } catch {
      return 0;
    }
  }

  /** Apply a state hash to one specific color slot. */
  function writeStateOne(cloth: Cloth, colorIndex: number, value: number): void {
    if (!stateEntry) return;
    try {
      arrSetEnum(stateEntry, slotIndex(cloth, colorIndex), value >>> 0);
      markDirty(stateEntry);
    } catch {
      /* skip */
    }
  }

  function writeQtyOne(cloth: Cloth, colorIndex: number, value: number): void {
    if (!ownNumEntry) return;
    const newQty = Math.max(0, Math.trunc(value));
    const idx = slotIndex(cloth, colorIndex);
    let prev;
    try {
      prev = arrGetInt(ownNumEntry, idx);
      arrSetInt(ownNumEntry, idx, newQty);
      markDirty(ownNumEntry);
    } catch {
      return;
    }
    if (prev === 0 && newQty > 0 && stateEntry) {
      try {
        if (arrGetEnum(stateEntry, idx) !== OBTAINED_HASH) {
          arrSetEnum(stateEntry, idx, OBTAINED_HASH);
          markDirty(stateEntry);
        }
      } catch {
        /* skip */
      }
    }
  }

  function writeStateAll(cloth: Cloth, value: number): void {
    if (!stateEntry) return;
    const v = value >>> 0;
    for (let c = 0; c < cloth.colorCount; c++) {
      try {
        arrSetEnum(stateEntry, slotIndex(cloth, c), v);
      } catch {
        /* skip */
      }
    }
    markDirty(stateEntry);
  }

  function writeQtyAll(cloth: Cloth, value: number): void {
    if (!ownNumEntry) return;
    const v = Math.max(0, Math.trunc(value));
    let bumpedAny = false;
    for (let c = 0; c < cloth.colorCount; c++) {
      const idx = slotIndex(cloth, c);
      try {
        const prev = arrGetInt(ownNumEntry, idx);
        arrSetInt(ownNumEntry, idx, v);
        if (prev === 0 && v > 0 && stateEntry) {
          if (arrGetEnum(stateEntry, idx) !== OBTAINED_HASH) {
            arrSetEnum(stateEntry, idx, OBTAINED_HASH);
            bumpedAny = true;
          }
        }
      } catch {
        /* skip */
      }
    }
    markDirty(ownNumEntry);
    if (bumpedAny && stateEntry) markDirty(stateEntry);
  }

  function applyBulkState(value: number): void {
    if (!stateEntry) return;
    const v = value >>> 0;
    for (const cloth of visibleCloths) {
      for (let c = 0; c < cloth.colorCount; c++) {
        try {
          arrSetEnum(stateEntry, slotIndex(cloth, c), v);
        } catch {
          /* skip */
        }
      }
    }
    markDirty(stateEntry);
  }

  function applyBulkQty(value: number): void {
    if (!ownNumEntry) return;
    const v = Math.max(0, value);
    let bumpedAny = false;
    for (const cloth of visibleCloths) {
      for (let c = 0; c < cloth.colorCount; c++) {
        const idx = slotIndex(cloth, c);
        try {
          arrSetInt(ownNumEntry, idx, v);
          if (v > 0 && stateEntry) {
            if (arrGetEnum(stateEntry, idx) !== OBTAINED_HASH) {
              arrSetEnum(stateEntry, idx, OBTAINED_HASH);
              bumpedAny = true;
            }
          }
        } catch {
          /* skip */
        }
      }
    }
    markDirty(ownNumEntry);
    if (bumpedAny && stateEntry) markDirty(stateEntry);
  }
</script>

{#if !stateEntry && !ownNumEntry}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.clothes.missing')}</p>
  </section>
{:else}
  <section class={CARD_CLASS}>
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-content-strong">{$_('player.clothes.heading')}</h3>
        <p class="text-xs text-content-muted">
          {$_('player.clothes.caption', { values: { count: visibleCloths.length } })}
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
        visibleCount={visibleCloths.length}
        hasState={!!stateEntry}
        hasQty={!!ownNumEntry}
        onApplyState={applyBulkState}
        onApplyQty={applyBulkQty}
      />
    </div>

    <p class="mt-3 text-xs text-content-muted">{$_('player.clothes.color_note')}</p>

    <div
      class="mt-2 max-h-160 overflow-y-auto rounded-xl border border-edge/40 bg-surface-muted/40"
    >
      {#if visibleCloths.length === 0}
        <p class="p-6 text-sm text-content-muted">{$_('player.inventory.empty')}</p>
      {:else}
        <ul class="divide-y divide-edge/40">
          {#each visibleCloths as cloth (cloth.index)}
            <ClothRow
              {cloth}
              label={clothLabel(cloth, ui)}
              primaryState={readState(cloth, 0)}
              primaryQty={readQty(cloth, 0)}
              readState={(ci) => readState(cloth, ci)}
              readQty={(ci) => readQty(cloth, ci)}
              writeStateAll={(v) => writeStateAll(cloth, v)}
              writeQtyAll={(v) => writeQtyAll(cloth, v)}
              writeStateOne={(ci, v) => writeStateOne(cloth, ci, v)}
              writeQtyOne={(ci, v) => writeQtyOne(cloth, ci, v)}
            />
          {/each}
        </ul>
      {/if}
    </div>
  </section>
{/if}
