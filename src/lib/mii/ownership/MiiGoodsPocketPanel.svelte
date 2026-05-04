<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { safe } from '$lib/sav/format';
  import { MII_SCHEMA } from '$lib/sav/schema';
  import {
    allTreasures,
    type Treasure,
    treasureByNameHash,
    treasureImageUrl,
    treasureLabel,
  } from '$lib/sav/lists/treasureList.svelte';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';

  type Props = {
    selectedIndex: number | null;
  };
  let { selectedIndex }: Props = $props();

  const mii = $derived(miiAccessor());

  const hasStringId = $derived(
    mii != null && mii.has(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.GoodsStringId),
  );
  const hasGetTime = $derived(
    mii != null && mii.has(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.GetTime),
  );
  const hasUgcIndex = $derived(
    mii != null && mii.has(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.UgcGoodsIndex),
  );

  const slotsPerMii = $derived.by(() => {
    if (!mii || !hasStringId) return 0;
    const total = mii.get(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.GoodsStringId).length;
    if (total === 0) return 0;
    const miiCount = mii.has(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Level)
      ? mii.get(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Level).length
      : 0;
    if (miiCount > 0 && total % miiCount === 0) return total / miiCount;
    return 12;
  });

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
    if (!mii || !hasStringId || selectedIndex == null || slotsPerMii === 0) return [];
    const out: Slot[] = [];
    for (let s = 0; s < slotsPerMii; s++) {
      const i = selectedIndex * slotsPerMii + s;
      const stringId =
        safe(
          () =>
            mii.getElement(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.GoodsStringId, i) as number,
          0,
        ) >>> 0;
      const ugcIndex = hasUgcIndex
        ? safe(
            () =>
              mii.getElement(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.UgcGoodsIndex, i) as number,
            -1,
          )
        : -1;
      const getTime = hasGetTime
        ? safe(
            () => mii.getElement(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.GetTime, i) as bigint,
            0n,
          )
        : 0n;
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
    if (!mii || !hasStringId) return;
    const next = (Number.parseInt(rawHash, 10) || 0) >>> 0;
    if (next === slot.stringId && slot.ugcIndex < 0) return;
    mii.setElement(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.GoodsStringId, slot.arrayIndex, next);
    if (hasUgcIndex) {
      mii.setElement(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.UgcGoodsIndex, slot.arrayIndex, -1);
    }
    if (hasGetTime) {
      const now = next === 0 ? 0n : BigInt(Math.floor(Date.now() / 1000));
      mii.setElement(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.GetTime, slot.arrayIndex, now);
    }
  }

  function clearSlot(slot: Slot): void {
    if (!mii || !hasStringId) return;
    mii.setElement(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.GoodsStringId, slot.arrayIndex, 0);
    if (hasUgcIndex) {
      mii.setElement(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.UgcGoodsIndex, slot.arrayIndex, -1);
    }
    if (hasGetTime) {
      mii.setElement(MII_SCHEMA.Mii.Belongings.GoodsOwnInfoSlot.GetTime, slot.arrayIndex, 0n);
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

{#if hasStringId && selectedIndex != null && slotsPerMii > 0}
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
