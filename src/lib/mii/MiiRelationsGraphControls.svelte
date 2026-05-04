<script lang="ts">
  import { _ } from 'svelte-i18n';

  type Props = {
    populated: number[];
    nameOf: (idx: number) => string;
    enabled: boolean;
    dropdownIndex: number | null;
    viewMode: 'all' | 'ego';
    presentTypes: string[];
    filterType: string;
    localizeRelationType: (name: string) => string;
    onDropdownChange: (idx: number | null) => void;
    onViewSelected: () => void;
    onViewAll: () => void;
    onFilterChange: (value: string) => void;
  };

  let {
    populated,
    nameOf,
    enabled,
    dropdownIndex,
    viewMode,
    presentTypes,
    filterType,
    localizeRelationType,
    onDropdownChange,
    onViewSelected,
    onViewAll,
    onFilterChange,
  }: Props = $props();
</script>

<div
  class="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-surface-sunken/70 px-3 py-2.5 ring-1 ring-edge/40"
>
  <label class="flex flex-col gap-1 text-xs text-content">
    <span class="font-bold text-content-strong">{$_('mii.relations.mii_selector')}</span>
    <select
      class="min-w-50 rounded-lg border border-edge/60 bg-surface px-2 py-1 text-sm text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
      value={dropdownIndex ?? ''}
      onchange={(e) => {
        const n = Number.parseInt(e.currentTarget.value, 10);
        onDropdownChange(Number.isFinite(n) ? n : null);
      }}
      disabled={!enabled}
    >
      {#if dropdownIndex == null}
        <option value="" disabled>{$_('mii.relations.select_placeholder')}</option>
      {/if}
      {#each populated as idx (idx)}
        <option value={idx}>
          {$_('mii.panel.slot_label', {
            values: { index: idx + 1, name: nameOf(idx) },
          })}
        </option>
      {/each}
    </select>
  </label>

  <button
    type="button"
    class="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-bold text-white shadow ring-2 ring-orange-600 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
    disabled={dropdownIndex == null}
    onclick={onViewSelected}
  >
    {$_('mii.relations.view_relationships')}
  </button>

  <button
    type="button"
    class="rounded-full border border-edge/60 bg-surface px-4 py-1.5 text-sm font-bold text-content shadow-sm transition hover:bg-surface-muted"
    class:!bg-surface-sunken={viewMode === 'all'}
    onclick={onViewAll}
  >
    {$_('mii.relations.view_all')}
  </button>

  {#if presentTypes.length > 0}
    <label class="ml-auto flex flex-col gap-1 text-xs text-content">
      <span class="font-bold text-content-strong">{$_('mii.relations.filter_type_label')}</span>
      <select
        class="rounded-lg border border-edge/60 bg-surface px-2 py-1 text-sm text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        value={filterType}
        onchange={(e) => onFilterChange(e.currentTarget.value)}
      >
        <option value="all">{$_('mii.relations.filter_all')}</option>
        {#each presentTypes as t (t)}
          <option value={t}>{localizeRelationType(t)}</option>
        {/each}
      </select>
    </label>
  {/if}
</div>
