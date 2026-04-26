<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { binaryArrayElements } from '../sav/codec';
  import { allFoods, foodImageUrl, foodLabel, type Food } from '../sav/foodList.svelte';
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
  const ui = $derived($locale);

  let search = $state('');
  let filter = $state<'all' | 'tried' | 'untried'>('all');

  const slotBytes = $derived.by<Uint8Array | null>(() => {
    void tick;
    const els = binaryArrayElements(entry);
    return els[index]?.bytes ?? null;
  });

  function readBit(bytes: Uint8Array, id: number): boolean {
    const byteIdx = id >>> 3;
    if (byteIdx >= bytes.byteLength) return false;
    return ((bytes[byteIdx] >>> (id & 7)) & 1) === 1;
  }

  function toggleBit(bytes: Uint8Array, id: number, value: boolean): void {
    const byteIdx = id >>> 3;
    if (byteIdx >= bytes.byteLength) return;
    const mask = 1 << (id & 7);
    if (value) bytes[byteIdx] |= mask;
    else bytes[byteIdx] &= ~mask;
  }

  type Row = { food: Food; tried: boolean };

  const sortedFoods = $derived.by(() => {
    const list = allFoods();
    return [...list]
      .filter((f) => f.id >= 0)
      .sort((a, b) => {
        const an = foodLabel(a, ui).toLocaleLowerCase();
        const bn = foodLabel(b, ui).toLocaleLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
  });

  const rows = $derived.by<Row[]>(() => {
    void tick;
    const bytes = slotBytes;
    if (!bytes) return [];
    return sortedFoods.map((food) => ({ food, tried: readBit(bytes, food.id) }));
  });

  const triedCount = $derived(rows.filter((r) => r.tried).length);

  const visibleRows = $derived.by(() => {
    const q = search.trim().toLocaleLowerCase();
    return rows.filter((r) => {
      if (filter === 'tried' && !r.tried) return false;
      if (filter === 'untried' && r.tried) return false;
      if (q && !foodLabel(r.food, ui).toLocaleLowerCase().includes(q)) return false;
      return true;
    });
  });

  function commitToggle(id: number, value: boolean): void {
    const bytes = slotBytes;
    if (!bytes) return;
    toggleBit(bytes, id, value);
    markDirty(entry);
  }
</script>

<div class="block min-w-0 sm:col-span-2">
  <div class="flex flex-wrap items-baseline justify-between gap-2">
    <span class={LABEL_CLASS}>{$_(`mii.fields.${field.labelKey}`)}</span>
    <span class="font-mono text-xs text-content-muted">
      {$_('mii.food.given_count', { values: { tried: triedCount, total: rows.length } })}
    </span>
  </div>

  <div class="mt-1.5 flex flex-wrap items-center gap-2">
    <input
      type="text"
      class="{FORM_INPUT_CLASS} max-w-xs"
      placeholder={$_('mii.food.search_placeholder')}
      value={search}
      oninput={(e) => (search = e.currentTarget.value)}
    />
    <select
      class="{FORM_INPUT_CLASS} max-w-[10rem]"
      value={filter}
      onchange={(e) => {
        const v = e.currentTarget.value;
        filter = v === 'tried' || v === 'untried' ? v : 'all';
      }}
    >
      <option value="all">{$_('mii.food.filter_all')}</option>
      <option value="tried">{$_('mii.food.filter_tried')}</option>
      <option value="untried">{$_('mii.food.filter_untried')}</option>
    </select>
  </div>

  <div class="mt-2 max-h-72 overflow-y-auto rounded-md border border-edge/40 bg-surface-muted p-2">
    {#if visibleRows.length === 0}
      <p class="p-2 text-xs text-content-muted">{$_('mii.food.no_results')}</p>
    {:else}
      <ul class="grid gap-1 sm:grid-cols-2">
        {#each visibleRows as row (row.food.id)}
          {@const imageUrl = foodImageUrl(row.food.textureId)}
          <li>
            <label
              class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-surface-sunken"
            >
              <input
                type="checkbox"
                class="h-4 w-4 shrink-0 accent-orange-500"
                checked={row.tried}
                onchange={(e) => commitToggle(row.food.id, e.currentTarget.checked)}
              />
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-edge/40 bg-surface"
                class:opacity-40={!row.tried}
              >
                {#if imageUrl}
                  <img
                    src={imageUrl}
                    alt=""
                    loading="lazy"
                    class="h-full w-full object-contain p-0.5"
                  />
                {/if}
              </span>
              <span class="truncate text-xs" class:text-content-muted={!row.tried}>
                {foodLabel(row.food, ui)}
              </span>
            </label>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if field.hintKey}
    <span class="mt-1 block text-xs text-content-muted">
      {$_(`mii.fields.${field.hintKey}`)}
    </span>
  {/if}
</div>
