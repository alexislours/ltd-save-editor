<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { arrGetUInt, arrSetUInt } from '../sav/codec';
  import { allFoods, foodByHash, foodImageUrl, foodLabel } from '../sav/foodList.svelte';
  import { safe } from '../sav/format';
  import type { Entry } from '../sav/types';
  import { FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import { markDirty, miiState } from './miiEditor.svelte';
  import type { MiiField } from './miiFields';

  const RANKS_PER_MII = 3;

  type Props = {
    entry: Entry;
    index: number;
    field: MiiField;
  };
  let { entry, index, field }: Props = $props();

  const tick = $derived(miiState.tick);
  const ui = $derived($locale);
  let error = $state<string | null>(null);

  const sortedFoods = $derived.by(() => {
    const list = allFoods();
    return [...list].sort((a, b) => {
      const an = foodLabel(a, ui).toLocaleLowerCase();
      const bn = foodLabel(b, ui).toLocaleLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  });

  const ranks = $derived.by(() => {
    void tick;
    const out: { rank: number; arrayIndex: number; hash: number }[] = [];
    for (let r = 0; r < RANKS_PER_MII; r++) {
      const arrayIndex = index * RANKS_PER_MII + r;
      const hash = safe(() => arrGetUInt(entry, arrayIndex), 0) >>> 0;
      out.push({ rank: r, arrayIndex, hash });
    }
    return out;
  });

  function commit(arrayIndex: number, raw: string): void {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    try {
      arrSetUInt(entry, arrayIndex, n >>> 0);
      markDirty(entry);
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<div class="block min-w-0">
  <span class={LABEL_CLASS}>{$_(`mii.fields.${field.labelKey}`)}</span>

  <div class="mt-1.5 grid gap-2">
    {#each ranks as r (r.rank)}
      {@const food = foodByHash(r.hash)}
      {@const imageUrl = foodImageUrl(food?.textureId ?? null)}
      <div class="flex items-start gap-3">
        <div class="w-6 shrink-0 pt-2 text-center font-mono text-xs text-content-muted">
          {$_('mii.food.rank_marker', { values: { rank: r.rank + 1 } })}
        </div>
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface"
        >
          {#if imageUrl}
            <img
              src={imageUrl}
              alt={food ? foodLabel(food, ui) : ''}
              loading="lazy"
              class="h-full w-full object-contain p-1"
            />
          {:else}
            <span class="text-[10px] text-content-faint">{$_('mii.food.no_image')}</span>
          {/if}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-bold text-content-strong">
            {#if food}
              {foodLabel(food, ui)}
            {:else if r.hash === 0}
              <span class="text-content-muted">{$_('mii.food.empty_rank')}</span>
            {:else}
              {$_('mii.food.unknown', { values: { hash: r.hash } })}
            {/if}
          </div>
          <select
            class="{FORM_INPUT_CLASS} mt-1"
            value={r.hash.toString()}
            onchange={(e) => commit(r.arrayIndex, e.currentTarget.value)}
          >
            <option value="0">{$_('mii.food.empty_rank')}</option>
            {#if r.hash !== 0 && !food}
              <option value={r.hash.toString()} selected>
                {$_('mii.food.unknown', { values: { hash: r.hash } })}
              </option>
            {/if}
            {#each sortedFoods as f (f.hash)}
              <option value={f.hash.toString()}>{foodLabel(f, ui)}</option>
            {/each}
          </select>
        </div>
      </div>
    {/each}
  </div>

  {#if field.hintKey}
    <span class="mt-1 block text-xs text-content-muted">
      {$_(`mii.fields.${field.hintKey}`)}
    </span>
  {/if}
  {#if error}
    <span class="mt-1 block text-xs text-danger">{error}</span>
  {/if}
</div>
