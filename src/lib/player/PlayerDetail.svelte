<script lang="ts">
  import { arrayCount, hasIndexedElementEditor, isArrayType } from '../sav/codec';
  import { _ } from 'svelte-i18n';
  import { DataType, DataTypeName } from '../sav/dataType';
  import { hexU32 } from '../sav/format';
  import { enumOptionsFor } from '../sav/knownKeys';
  import type { Entry } from '../sav/types';
  import { markDirty as playerMarkDirty } from '../playerEditor.svelte';
  import { INPUT_CLASS, MONO_INPUT_CLASS, PILL_BUTTON_CLASS } from '../styles';
  import ArrayElementEditor from './ArrayElementEditor.svelte';
  import EntryEditor from './EntryEditor.svelte';
  import { arrayElementScalarAccess, parseBulkValueForArrayType } from './scalarFieldAccess';

  type Props = {
    entry: Entry;
    path: string | null;
    markDirty?: (e: Entry) => void;
  };
  let { entry, path, markDirty = playerMarkDirty }: Props = $props();

  const isArray = $derived(isArrayType(entry.type));
  const count = $derived(isArray ? arrayCount(entry) : 0);
  const canEditElements = $derived(hasIndexedElementEditor(entry.type));

  const PAGE_SIZE = 100;
  let page = $state(0);
  $effect(() => {
    void entry;
    page = 0;
    bulkError = null;
    bulkInput = '';
  });
  const pageCount = $derived(Math.max(1, Math.ceil(count / PAGE_SIZE)));
  const start = $derived(page * PAGE_SIZE);
  const end = $derived(Math.min(count, start + PAGE_SIZE));

  let bulkInput = $state('');
  let bulkError = $state<string | null>(null);
  let bulkTick = $state(0);

  function applyBulk(): void {
    bulkError = null;
    const parsed = parseBulkValueForArrayType(entry.type, bulkInput);
    if (!parsed.ok) {
      bulkError = parsed.error;
      return;
    }
    const value = parsed.value;
    try {
      for (let i = 0; i < count; i++) {
        const access = arrayElementScalarAccess(entry, i);
        if (!access) throw new Error('Bulk edit not supported for this type');
        // The parser guarantees `value` matches `access.kind` for this entry type.
        (access.write as (v: typeof value) => void)(value);
      }
      markDirty(entry);
      bulkTick++;
    } catch (e) {
      bulkError = e instanceof Error ? e.message : String(e);
    }
  }

  const BULK_SUPPORTED_TYPES = new Set<DataType>([
    DataType.BoolArray,
    DataType.IntArray,
    DataType.UIntArray,
    DataType.FloatArray,
    DataType.EnumArray,
    DataType.Int64Array,
    DataType.UInt64Array,
    DataType.String16Array,
    DataType.String32Array,
    DataType.String64Array,
    DataType.WString16Array,
    DataType.WString32Array,
    DataType.WString64Array,
  ]);
  const bulkSupported = $derived(BULK_SUPPORTED_TYPES.has(entry.type));
  const bulkEnumOptions = $derived(
    entry.type === DataType.EnumArray ? (enumOptionsFor(entry.hash) ?? null) : null,
  );

  const indices = $derived(Array.from({ length: Math.max(0, end - start) }, (_, k) => start + k));

  function placeholderFor(t: DataType): string {
    switch (t) {
      case DataType.BoolArray:
        return 'true / false';
      case DataType.EnumArray:
        return '0x…';
      case DataType.Int64Array:
      case DataType.UInt64Array:
        return '12345';
      case DataType.FloatArray:
        return '0.0';
      default:
        return '0';
    }
  }

  const bulkInputClass = `w-full max-w-48 ${MONO_INPUT_CLASS}`;
  const bulkSelectClass = `w-full max-w-64 ${INPUT_CLASS}`;
</script>

<div>
  <header class="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
    <h3 class="text-lg font-bold text-content-strong">
      {path ?? $_('advanced.detail_unknown_path')}
    </h3>
    <span class="font-mono text-xs text-content-muted">
      {hexU32(entry.hash)} · {DataTypeName[entry.type]}{isArray ? `[${count}]` : ''}
    </span>
  </header>

  {#if !isArray}
    <div class="max-w-xl">
      <EntryEditor {entry} {markDirty} />
    </div>
  {:else if !canEditElements}
    <p class="text-sm text-content-muted">
      {$_('advanced.detail_readonly_browsing', { values: { type: DataTypeName[entry.type] } })}
    </p>
  {:else if count === 0}
    <p class="text-sm text-content-muted">{$_('advanced.detail_empty_array')}</p>
  {:else}
    {#if bulkSupported}
      <div
        class="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface-sunken/80 p-2 ring-1 ring-edge/40"
      >
        <span class="text-xs font-bold text-content-strong">{$_('advanced.bulk_label')}</span>
        {#if bulkEnumOptions && bulkEnumOptions.length > 0}
          <select
            class={bulkSelectClass}
            value={bulkInput}
            onchange={(e) => (bulkInput = e.currentTarget.value)}
          >
            <option value="">{$_('advanced.bulk_enum_pick')}</option>
            {#each bulkEnumOptions as opt (opt.hash)}
              <option value={String(opt.hash)}>{opt.label ?? opt.name}</option>
            {/each}
          </select>
        {:else}
          <input
            type="text"
            class={bulkInputClass}
            placeholder={placeholderFor(entry.type)}
            bind:value={bulkInput}
            onkeydown={(e) => e.key === 'Enter' && applyBulk()}
          />
        {/if}
        <button type="button" class={PILL_BUTTON_CLASS} onclick={applyBulk}>
          {$_('advanced.bulk_apply_action', { values: { count } })}
        </button>
        {#if bulkError}
          <span class="text-xs text-danger">{bulkError}</span>
        {/if}
      </div>
    {/if}

    {#key bulkTick}
      <div class="overflow-x-auto rounded-xl ring-1 ring-edge/40">
        <table class="w-full text-sm">
          <thead class="bg-surface-sunken/70 text-left text-xs font-bold text-content-strong">
            <tr>
              <th class="w-20 px-3 py-2 font-bold">{$_('advanced.table_header_index')}</th>
              <th class="px-3 py-2 font-bold">{$_('advanced.table_header_value')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-edge/40">
            {#each indices as i (i)}
              <tr>
                <td class="px-3 py-1.5 font-mono text-xs text-content-muted">
                  {i}
                </td>
                <td class="px-3 py-1.5">
                  <ArrayElementEditor {entry} index={i} {markDirty} />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/key}

    {#if pageCount > 1}
      <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          class="{PILL_BUTTON_CLASS} disabled:opacity-50"
          disabled={page <= 0}
          onclick={() => (page = Math.max(0, page - 1))}
        >
          {$_('advanced.page_previous')}
        </button>
        <span
          class="order-last w-full text-center text-xs text-content-muted sm:order-none sm:w-auto"
        >
          {$_('advanced.page_elements_status', {
            values: { start, end: end - 1, count, page: page + 1, total: pageCount },
          })}
        </span>
        <button
          type="button"
          class="{PILL_BUTTON_CLASS} disabled:opacity-50"
          disabled={page >= pageCount - 1}
          onclick={() => (page = Math.min(pageCount - 1, page + 1))}
        >
          {$_('advanced.page_next')}
        </button>
      </div>
    {/if}
  {/if}
</div>
