<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { actorDisplay, allActors } from '$lib/map/actors';
  import { foodByHash, foodImageUrl, foodLabel } from '$lib/sav/lists/foodList.svelte';
  import { safe } from '$lib/sav/format';
  import { MII_SCHEMA } from '$lib/sav/schema';
  import type { Trouble, TroubleTargetKey } from '$lib/sav/lists/troubleList.svelte';
  import { CARD_BASE_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';
  import { populatedMiiIndices } from '$lib/mii/ownership/populated';
  import {
    ITEM_TYPE_LABEL_KEY,
    ITEM_TYPE_VALUES,
    TROUBLE_FIELDS,
    type ItemTypeValue,
    type TroubleFieldKey,
  } from './troubleFields';
  import {
    clothByHash,
    sortedClothesFor,
    sortedFoodsFor,
    sortedTreasuresFor,
    treasureByHash,
  } from './troubleLookups';

  type Props = {
    selectedIndex: number;
    targetKind: TroubleTargetKey;
    currentTrouble: Trouble | null;
  };
  let { selectedIndex, targetKind, currentTrouble }: Props = $props();

  const ui = $derived($locale);
  const mii = $derived(miiAccessor());

  function has(key: TroubleFieldKey): boolean {
    return mii != null && mii.has(TROUBLE_FIELDS[key].leaf);
  }
  function arrIndex(key: TroubleFieldKey, slot: number): number {
    return selectedIndex * TROUBLE_FIELDS[key].perMii + slot;
  }
  function getInt(key: TroubleFieldKey, slot: number, fallback: number): number {
    if (!mii || !has(key)) return fallback;
    return safe(
      () => mii.getElement(TROUBLE_FIELDS[key].leaf, arrIndex(key, slot)) as number,
      fallback,
    );
  }
  function setInt(key: TroubleFieldKey, slot: number, v: number): void {
    if (!mii || !has(key)) return;
    try {
      mii.setElement(TROUBLE_FIELDS[key].leaf, arrIndex(key, slot), v | 0);
    } catch {
      /* skip */
    }
  }
  function getUInt(key: TroubleFieldKey, slot: number, fallback = 0): number {
    if (!mii || !has(key)) return fallback;
    return (
      safe(
        () => mii.getElement(TROUBLE_FIELDS[key].leaf, arrIndex(key, slot)) as number,
        fallback,
      ) >>> 0
    );
  }
  function setUInt(key: TroubleFieldKey, slot: number, v: number): void {
    if (!mii || !has(key)) return;
    try {
      mii.setElement(TROUBLE_FIELDS[key].leaf, arrIndex(key, slot), v >>> 0);
    } catch {
      /* skip */
    }
  }

  const miiOptions = $derived.by(() => {
    if (!mii || !mii.has(MII_SCHEMA.Mii.Name.Name)) return [] as { index: number; name: string }[];
    return populatedMiiIndices(mii).map((i) => {
      const n = safe(() => mii.getElement(MII_SCHEMA.Mii.Name.Name, i) as string, '');
      return { index: i, name: n };
    });
  });

  const sortedFoods = $derived(sortedFoodsFor(ui));
  const sortedClothes = $derived(sortedClothesFor(ui));
  const sortedTreasures = $derived(sortedTreasuresFor(ui));
  const sortedActors = $derived(allActors());
</script>

{#if targetKind === 'targetMii'}
  {@const slotCount = Math.max(1, Math.min(4, currentTrouble?.targetMiiNum ?? 4))}
  {@const slots = Array.from({ length: slotCount }, (_, i) => i)}
  <div class="grid gap-3 sm:grid-cols-2">
    {#each slots as slot (slot)}
      {@const v = getInt('targetMii', slot, -1)}
      <label class="block min-w-0">
        <span class={LABEL_CLASS}>
          {$_('mii.troubles.target_mii', { values: { n: slot + 1 } })}
        </span>
        <select
          class={FORM_INPUT_CLASS}
          value={v.toString()}
          onchange={(e) => setInt('targetMii', slot, Number.parseInt(e.currentTarget.value, 10))}
        >
          <option value="-1">{$_('mii.troubles.target_none')}</option>
          {#each miiOptions as m (m.index)}
            <option value={m.index.toString()}>
              #{m.index + 1} · {m.name}
            </option>
          {/each}
          {#if v >= 0 && !miiOptions.some((m) => m.index === v)}
            <option value={v.toString()} selected>
              #{v + 1} · {$_('mii.troubles.target_mii_unknown')}
            </option>
          {/if}
        </select>
      </label>
    {/each}
  </div>
{:else if targetKind === 'targetItemType'}
  {@const tv = getInt('targetItemType', 0, -1) as ItemTypeValue}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.target_item_type')}</span>
    <select
      class={FORM_INPUT_CLASS}
      value={tv.toString()}
      onchange={(e) => setInt('targetItemType', 0, Number.parseInt(e.currentTarget.value, 10))}
    >
      {#each ITEM_TYPE_VALUES as v (v)}
        <option value={v.toString()}>
          {$_(`mii.troubles.item_type.${ITEM_TYPE_LABEL_KEY[v]}`)}
        </option>
      {/each}
    </select>
  </label>
{:else if targetKind === 'targetFood'}
  {@const fv = getUInt('targetFood', 0)}
  {@const food = foodByHash(fv)}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.target_food')}</span>
    <div class="mt-1.5 flex items-start gap-3">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface"
      >
        {#if food && foodImageUrl(food.textureId)}
          <img
            src={foodImageUrl(food.textureId)}
            alt={foodLabel(food, ui)}
            class="h-full w-full object-contain p-0.5"
            loading="lazy"
          />
        {:else}
          <span class="text-[10px] text-content-faint">-</span>
        {/if}
      </div>
      <select
        class="{FORM_INPUT_CLASS} mt-0 flex-1"
        value={fv.toString()}
        onchange={(e) =>
          setUInt('targetFood', 0, (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0)}
      >
        <option value="0">{$_('mii.troubles.target_none')}</option>
        {#if !food && fv !== 0}
          <option value={fv.toString()} selected>
            {$_('mii.troubles.unknown', {
              values: { hash: '0x' + fv.toString(16).padStart(8, '0') },
            })}
          </option>
        {/if}
        {#each sortedFoods as f (f.hash)}
          <option value={f.hash.toString()}>{foodLabel(f, ui)}</option>
        {/each}
      </select>
    </div>
  </label>
{:else if targetKind === 'targetCloth'}
  {@const cv = getUInt('targetCloth', 0)}
  {@const cloth = clothByHash(cv, ui)}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.target_cloth')}</span>
    <select
      class={FORM_INPUT_CLASS}
      value={cv.toString()}
      onchange={(e) =>
        setUInt('targetCloth', 0, (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0)}
    >
      <option value="0">{$_('mii.troubles.target_none')}</option>
      {#if !cloth && cv !== 0}
        <option value={cv.toString()} selected>
          {$_('mii.troubles.unknown', {
            values: { hash: '0x' + cv.toString(16).padStart(8, '0') },
          })}
        </option>
      {/if}
      {#each sortedClothes as c (c.hash)}
        <option value={c.hash.toString()}>{c.label}</option>
      {/each}
    </select>
  </label>
{:else if targetKind === 'targetCoordinate'}
  {@const cov = getUInt('targetCoordinate', 0)}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.target_coordinate')}</span>
    <input
      type="text"
      inputmode="numeric"
      class="{FORM_INPUT_CLASS} font-mono"
      value={cov.toString()}
      onchange={(e) =>
        setUInt('targetCoordinate', 0, (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0)}
    />
    <span class="mt-1 block text-xs text-content-muted">
      {$_('mii.troubles.target_coordinate_hint')}
    </span>
  </label>
{:else if targetKind === 'targetGoods'}
  {@const gv = getUInt('targetGoods', 0)}
  {@const treasure = treasureByHash(gv, ui)}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.target_goods')}</span>
    <select
      class={FORM_INPUT_CLASS}
      value={gv.toString()}
      onchange={(e) =>
        setUInt('targetGoods', 0, (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0)}
    >
      <option value="0">{$_('mii.troubles.target_none')}</option>
      {#if !treasure && gv !== 0}
        <option value={gv.toString()} selected>
          {$_('mii.troubles.unknown', {
            values: { hash: '0x' + gv.toString(16).padStart(8, '0') },
          })}
        </option>
      {/if}
      {#each sortedTreasures as t (t.hash)}
        <option value={t.hash.toString()}>{t.label}</option>
      {/each}
    </select>
  </label>
{:else if targetKind === 'targetUgcFood'}
  {@const uv = getInt('targetUgcFood', 0, -1)}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.target_ugc_food')}</span>
    <input
      type="text"
      inputmode="numeric"
      class="{FORM_INPUT_CLASS} font-mono"
      value={uv.toString()}
      onchange={(e) => setInt('targetUgcFood', 0, Number.parseInt(e.currentTarget.value, 10))}
    />
  </label>
{:else if targetKind === 'targetUgcGoods'}
  {@const uv = getInt('targetUgcGoods', 0, -1)}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.target_ugc_goods')}</span>
    <input
      type="text"
      inputmode="numeric"
      class="{FORM_INPUT_CLASS} font-mono"
      value={uv.toString()}
      onchange={(e) => setInt('targetUgcGoods', 0, Number.parseInt(e.currentTarget.value, 10))}
    />
  </label>
{:else if targetKind === 'targetUgcText'}
  {@const uv = getInt('targetUgcText', 0, -1)}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.target_ugc_text')}</span>
    <input
      type="text"
      inputmode="numeric"
      class="{FORM_INPUT_CLASS} font-mono"
      value={uv.toString()}
      onchange={(e) => setInt('targetUgcText', 0, Number.parseInt(e.currentTarget.value, 10))}
    />
  </label>
{:else if targetKind === 'targetPreset'}
  {@const pv = getInt('targetPreset', 0, -1)}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.target_preset_index')}</span>
    <input
      type="text"
      inputmode="numeric"
      class="{FORM_INPUT_CLASS} font-mono"
      value={pv.toString()}
      onchange={(e) => setInt('targetPreset', 0, Number.parseInt(e.currentTarget.value, 10))}
    />
  </label>
{:else if targetKind === 'targetMapObject'}
  <div class="block min-w-0">
    <span class={LABEL_CLASS}>{$_('mii.troubles.map_objects_heading')}</span>
    <div class="mt-1.5 grid gap-2">
      {#each [0, 1, 2, 3, 4] as slot (slot)}
        {@const idV = getUInt('mapObjId', slot)}
        {@const xV = getInt('mapObjX', slot, 0)}
        {@const yV = getInt('mapObjY', slot, 0)}
        {@const display = idV === 0 ? null : actorDisplay(idV)}
        <div
          class="{CARD_BASE_CLASS} grid grid-cols-2 items-end gap-2 px-3 py-2 sm:grid-cols-[2fr_1fr_1fr]"
        >
          <label class="col-span-2 block min-w-0 sm:col-span-1">
            <span class="text-[11px] font-bold text-content-faint">
              {$_('mii.troubles.map_object_label', { values: { n: slot + 1 } })}
            </span>
            <select
              class={FORM_INPUT_CLASS}
              value={idV.toString()}
              onchange={(e) =>
                setUInt('mapObjId', slot, (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0)}
            >
              <option value="0">{$_('mii.troubles.target_none')}</option>
              {#if display && !display.key && idV !== 0}
                <option value={idV.toString()} selected>
                  {$_('mii.troubles.unknown', {
                    values: { hash: '0x' + idV.toString(16).padStart(8, '0') },
                  })}
                </option>
              {/if}
              {#each sortedActors as a (a.hash)}
                <option value={a.hash.toString()}>{a.label}</option>
              {/each}
            </select>
          </label>
          <label class="block min-w-0">
            <span class="text-[11px] font-bold text-content-faint">X</span>
            <input
              type="text"
              inputmode="numeric"
              class="{FORM_INPUT_CLASS} font-mono"
              value={xV.toString()}
              onchange={(e) => setInt('mapObjX', slot, Number.parseInt(e.currentTarget.value, 10))}
            />
          </label>
          <label class="block min-w-0">
            <span class="text-[11px] font-bold text-content-faint">Y</span>
            <input
              type="text"
              inputmode="numeric"
              class="{FORM_INPUT_CLASS} font-mono"
              value={yV.toString()}
              onchange={(e) => setInt('mapObjY', slot, Number.parseInt(e.currentTarget.value, 10))}
            />
          </label>
        </div>
      {/each}
    </div>
  </div>
{/if}
