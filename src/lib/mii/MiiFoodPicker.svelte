<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { arrGetUInt, arrSetUInt } from '../sav/codec';
  import { allFoods, foodByHash, foodImageUrl, foodLabel } from '../sav/foodList.svelte';
  import { safe } from '../sav/format';
  import type { Entry } from '../sav/types';
  import { FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import { markDirty, miiState } from './miiEditor.svelte';
  import type { MiiField } from './miiFields';

  type Props = {
    entry: Entry;
    index: number;
    field: MiiField;
  };
  let { entry, index, field }: Props = $props();

  const tick = $derived(miiState.tick);
  let error = $state<string | null>(null);

  const ui = $derived($locale);

  const currentHash = $derived.by(() => {
    void tick;
    return safe(() => arrGetUInt(entry, index), 0) >>> 0;
  });
  const currentFood = $derived(foodByHash(currentHash));

  const sortedFoods = $derived.by(() => {
    const list = allFoods();
    return [...list].sort((a, b) => {
      const an = foodLabel(a, ui).toLocaleLowerCase();
      const bn = foodLabel(b, ui).toLocaleLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  });

  const imageUrl = $derived(foodImageUrl(currentFood?.textureId ?? null));

  function commit(rawHash: string): void {
    const n = Number.parseInt(rawHash, 10);
    if (!Number.isFinite(n)) return;
    try {
      arrSetUInt(entry, index, n >>> 0);
      markDirty(entry);
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<label class="block min-w-0">
  <span class={LABEL_CLASS}>{$_(`mii.fields.${field.labelKey}`)}</span>

  <div class="mt-1.5 flex items-start gap-3">
    <div
      class="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface"
    >
      {#if imageUrl}
        <img
          src={imageUrl}
          alt={currentFood ? foodLabel(currentFood, ui) : ''}
          loading="lazy"
          class="h-full w-full object-contain p-1"
        />
      {:else}
        <span class="text-[10px] text-content-faint">{$_('mii.food.no_image')}</span>
      {/if}
    </div>

    <div class="min-w-0 flex-1">
      <div class="text-sm font-bold text-content-strong">
        {#if currentFood}
          {foodLabel(currentFood, ui)}
        {:else}
          {$_('mii.food.unknown', { values: { hash: currentHash } })}
        {/if}
      </div>
      <select
        class="{FORM_INPUT_CLASS} mt-1"
        value={currentHash.toString()}
        onchange={(e) => commit(e.currentTarget.value)}
      >
        {#if !currentFood && currentHash !== 0}
          <option value={currentHash.toString()} selected>
            {$_('mii.food.unknown', { values: { hash: currentHash } })}
          </option>
        {/if}
        {#each sortedFoods as f (f.hash)}
          <option value={f.hash.toString()}>{foodLabel(f, ui)}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if field.hintKey}
    <span class="mt-1 block text-xs text-content-muted">
      {$_(`mii.fields.${field.hintKey}`)}
    </span>
  {/if}
  {#if error}
    <span class="mt-1 block text-xs text-danger">{error}</span>
  {/if}
</label>
