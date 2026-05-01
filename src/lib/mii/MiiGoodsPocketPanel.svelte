<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import {
    arrayCount,
    arrGetInt,
    arrGetUInt,
    arrGetUInt64,
    arrSetInt,
    arrSetUInt,
    arrSetUInt64,
  } from '../sav/codec';
  import { safe } from '../sav/format';
  import {
    allTreasures,
    type Treasure,
    treasureByNameHash,
    treasureImageUrl,
    treasureLabel,
  } from '../sav/treasureList.svelte';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import { markDirty, miiState } from './miiEditor.svelte';

  type Props = {
    byHash: SvelteMap<number, Entry>;
    selectedIndex: number | null;
  };
  let { byHash, selectedIndex }: Props = $props();

  const STRING_ID_HASH = murmur3_x86_32('Mii.Belongings.GoodsOwnInfoSlot.GoodsStringId') >>> 0;
  const GET_TIME_HASH = murmur3_x86_32('Mii.Belongings.GoodsOwnInfoSlot.GetTime') >>> 0;
  const UGC_INDEX_HASH = murmur3_x86_32('Mii.Belongings.GoodsOwnInfoSlot.UgcGoodsIndex') >>> 0;

  const stringIdEntry = $derived(byHash.get(STRING_ID_HASH) ?? null);
  const getTimeEntry = $derived(byHash.get(GET_TIME_HASH) ?? null);
  const ugcIndexEntry = $derived(byHash.get(UGC_INDEX_HASH) ?? null);

  const slotsPerMii = $derived.by(() => {
    if (!stringIdEntry) return 0;
    const total = arrayCount(stringIdEntry);
    if (total === 0) return 0;
    const meterEntry = byHash.get(murmur3_x86_32('Mii.MiiMisc.SatisfyInfo.Level') >>> 0);
    const miiCount = meterEntry ? arrayCount(meterEntry) : 0;
    if (miiCount > 0 && total % miiCount === 0) return total / miiCount;
    return 12;
  });

  const tick = $derived(miiState.tick);
  const ui = $derived($locale);

  type Slot = {
    slotIndex: number;
    arrayIndex: number;
    stringId: number;
    ugcIndex: number;
    getTime: bigint;
    goods: Treasure | null;
  };

  const slots = $derived.by<Slot[]>(() => {
    void tick;
    if (!stringIdEntry || selectedIndex == null || slotsPerMii === 0) return [];
    const out: Slot[] = [];
    for (let s = 0; s < slotsPerMii; s++) {
      const i = selectedIndex * slotsPerMii + s;
      const stringId = safe(() => arrGetUInt(stringIdEntry, i), 0) >>> 0;
      const ugcIndex = ugcIndexEntry ? safe(() => arrGetInt(ugcIndexEntry, i), -1) : -1;
      const getTime = getTimeEntry ? safe(() => arrGetUInt64(getTimeEntry, i), 0n) : 0n;
      out.push({
        slotIndex: s,
        arrayIndex: i,
        stringId,
        ugcIndex,
        getTime,
        goods: stringId === 0 ? null : treasureByNameHash(stringId),
      });
    }
    return out;
  });

  const usedCount = $derived(slots.filter((s) => s.stringId !== 0 || s.ugcIndex >= 0).length);

  type GoodsGroup = { type: 'Levelup' | 'Treasure' | 'Other'; label: string; goods: Treasure[] };
  const groupedGoods = $derived.by<GoodsGroup[]>(() => {
    const cmp = (a: Treasure, b: Treasure) =>
      treasureLabel(a, ui)
        .toLocaleLowerCase()
        .localeCompare(treasureLabel(b, ui).toLocaleLowerCase());
    const levelup: Treasure[] = [];
    const treasure: Treasure[] = [];
    const other: Treasure[] = [];
    for (const g of allTreasures()) {
      if (g.type === 'Levelup') levelup.push(g);
      else if (g.type === 'Treasure') treasure.push(g);
      else other.push(g);
    }
    levelup.sort(cmp);
    treasure.sort(cmp);
    other.sort(cmp);
    const out: GoodsGroup[] = [];
    if (levelup.length > 0)
      out.push({
        type: 'Levelup',
        label: $_('mii.belongings.goods_group_levelup'),
        goods: levelup,
      });
    if (treasure.length > 0)
      out.push({
        type: 'Treasure',
        label: $_('mii.belongings.goods_group_treasure'),
        goods: treasure,
      });
    if (other.length > 0)
      out.push({ type: 'Other', label: $_('mii.belongings.goods_group_other'), goods: other });
    return out;
  });

  function commitGoods(slot: Slot, rawHash: string): void {
    if (!stringIdEntry) return;
    const next = (Number.parseInt(rawHash, 10) || 0) >>> 0;
    if (next === slot.stringId && slot.ugcIndex < 0) return;
    arrSetUInt(stringIdEntry, slot.arrayIndex, next);
    markDirty(stringIdEntry);
    if (ugcIndexEntry) {
      arrSetInt(ugcIndexEntry, slot.arrayIndex, -1);
      markDirty(ugcIndexEntry);
    }
    if (getTimeEntry) {
      const now = next === 0 ? 0n : BigInt(Math.floor(Date.now() / 1000));
      arrSetUInt64(getTimeEntry, slot.arrayIndex, now);
      markDirty(getTimeEntry);
    }
  }

  function clearSlot(slot: Slot): void {
    if (!stringIdEntry) return;
    arrSetUInt(stringIdEntry, slot.arrayIndex, 0);
    markDirty(stringIdEntry);
    if (ugcIndexEntry) {
      arrSetInt(ugcIndexEntry, slot.arrayIndex, -1);
      markDirty(ugcIndexEntry);
    }
    if (getTimeEntry) {
      arrSetUInt64(getTimeEntry, slot.arrayIndex, 0n);
      markDirty(getTimeEntry);
    }
  }

  function clearAll(): void {
    for (const s of slots) {
      if (s.stringId !== 0 || s.ugcIndex >= 0) clearSlot(s);
    }
  }

  function formatGetTime(t: bigint): string | null {
    if (t === 0n) return null;
    const ms = Number(t) * 1000;
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString();
  }
</script>

{#if stringIdEntry && selectedIndex != null && slotsPerMii > 0}
  <section class={CARD_CLASS}>
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="text-base font-bold text-content-strong">
          {$_('mii.belongings.goods_heading')}
        </h3>
        <p class="mt-0.5 text-xs text-content-muted">
          {$_('mii.belongings.goods_caption')}
        </p>
      </div>
      <span class="font-mono text-xs text-content-muted whitespace-nowrap">
        {$_('mii.belongings.goods_summary', {
          values: { used: usedCount, total: slotsPerMii },
        })}
      </span>
    </div>

    <div class="mt-3 flex flex-wrap gap-1.5">
      <button
        type="button"
        class="rounded border border-edge/50 px-2 py-1 text-[11px] font-bold text-content-muted hover:bg-surface-sunken hover:text-content-strong"
        onclick={clearAll}
      >
        {$_('mii.belongings.goods_clear_all_action')}
      </button>
    </div>

    <ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each slots as slot (slot.slotIndex)}
        {@const label = slot.goods ? treasureLabel(slot.goods, ui) : null}
        {@const dateLabel = formatGetTime(slot.getTime)}
        {@const isUgc = slot.ugcIndex >= 0}
        {@const hasUnknown = slot.stringId !== 0 && !slot.goods && !isUgc}
        <li class="rounded-lg bg-surface-sunken/40 p-3 ring-1 ring-edge/30">
          <div class="flex items-baseline justify-between gap-2">
            <span class={LABEL_CLASS}>
              {$_('mii.belongings.goods_slot_label', { values: { index: slot.slotIndex + 1 } })}
            </span>
            <button
              type="button"
              class="rounded border border-edge/50 px-1.5 py-0.5 text-[10px] font-bold text-content-muted hover:bg-surface-sunken hover:text-content-strong"
              onclick={() => clearSlot(slot)}
              title={$_('mii.belongings.goods_clear_slot_tip')}
            >
              {$_('mii.belongings.worn_clear_action')}
            </button>
          </div>
          <div class="mt-2 flex items-start gap-2">
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface"
            >
              {#if slot.goods}
                <img
                  src={treasureImageUrl(slot.goods)}
                  alt={label ?? ''}
                  loading="lazy"
                  class="h-full w-full object-contain p-1"
                />
              {:else}
                <span class="text-[10px] text-content-faint">—</span>
              {/if}
            </div>
            <div class="min-w-0 flex-1">
              {#if isUgc}
                <span class="block text-sm font-bold text-content-strong">
                  {$_('mii.belongings.goods_ugc_label', { values: { index: slot.ugcIndex } })}
                </span>
                <span class="mt-1 block text-[11px] text-content-muted">
                  {$_('mii.belongings.goods_ugc_caption')}
                </span>
              {:else}
                <select
                  class={FORM_INPUT_CLASS}
                  value={slot.stringId.toString()}
                  onchange={(e) => commitGoods(slot, e.currentTarget.value)}
                >
                  <option value="0">{$_('mii.belongings.worn_none')}</option>
                  {#if hasUnknown}
                    <option value={slot.stringId.toString()} selected>
                      {$_('mii.belongings.worn_unknown', {
                        values: { hash: '0x' + slot.stringId.toString(16).padStart(8, '0') },
                      })}
                    </option>
                  {/if}
                  {#each groupedGoods as group (group.type)}
                    <optgroup label={group.label}>
                      {#each group.goods as g (g.nameHash)}
                        <option value={g.nameHash.toString()}>{treasureLabel(g, ui)}</option>
                      {/each}
                    </optgroup>
                  {/each}
                </select>
                {#if slot.goods}
                  <span class="mt-1 block truncate font-mono text-[10px] text-content-faint">
                    {slot.goods.name}
                    {#if slot.goods.type}
                      · {slot.goods.type}
                    {/if}
                  </span>
                {/if}
              {/if}
              {#if dateLabel}
                <span class="mt-1 block text-[10px] text-content-muted">
                  {$_('mii.belongings.goods_received_label', { values: { time: dateLabel } })}
                </span>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/if}
