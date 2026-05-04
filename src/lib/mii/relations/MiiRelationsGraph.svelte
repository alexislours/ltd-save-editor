<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { untrack } from 'svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import { CARD_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';
  import { localizeRelationType as localizeRelationTypeFor } from '$lib/mii/miiLabelList.svelte';
  import { findRelations, readMiiName } from './relations';
  import {
    allPairsView,
    compareByGroupThenOutMeter,
    egoView,
    GROUP_ORDER,
    isHiddenType,
    TYPE_COLORS,
    FALLBACK_COLOR,
  } from './relationsModel';
  import { populatedMiiIndices } from '$lib/mii/ownership/populated';
  import { computeForceLayout } from './forceLayout';
  import { CENTER_X, CENTER_Y, SIZE } from './relationsGraphHelpers';
  import MiiRelationsGraphControls from './MiiRelationsGraphControls.svelte';
  import MiiRelationsGraphAllSvg from './MiiRelationsGraphAllSvg.svelte';
  import MiiRelationsGraphEgoSvg from './MiiRelationsGraphEgoSvg.svelte';

  type Props = {
    selectedIndex: number | null;
    onSelect: (miiIndex: number) => void;
  };
  let { selectedIndex, onSelect }: Props = $props();

  const mii = $derived(miiAccessor());
  const re = $derived(mii ? findRelations(mii) : null);

  const allPairs = $derived.by(() => {
    if (!mii || !re) return [];
    return allPairsView(mii, re);
  });

  const populated = $derived.by(() => {
    if (!mii || !re) return [];
    return populatedMiiIndices(mii);
  });

  type ViewMode = 'all' | 'ego';

  let viewMode = $state<ViewMode>(untrack(() => (selectedIndex != null ? 'ego' : 'all')));

  let dropdownIndex = $state<number | null>(untrack(() => selectedIndex));
  $effect(() => {
    if (selectedIndex != null) dropdownIndex = selectedIndex;
  });

  function viewSelected() {
    if (dropdownIndex == null) return;
    onSelect(dropdownIndex);
    viewMode = 'ego';
  }
  function viewAll() {
    viewMode = 'all';
  }

  const allLayout = $derived.by<Map<number, { x: number; y: number }>>(() => {
    if (viewMode !== 'all') return new Map();
    const nodes = populated.map((idx) => ({ index: idx }));
    const edges = allPairs.map((p) => ({ a: p.a, b: p.b }));
    return computeForceLayout(nodes, edges, { size: SIZE });
  });

  const egoEdges = $derived.by(() => {
    if (viewMode !== 'ego' || selectedIndex == null || !mii || !re) return [];
    return egoView(mii, re, selectedIndex)
      .filter((e) => !isHiddenType(e.outTypeName) || !isHiddenType(e.inTypeName))
      .sort(compareByGroupThenOutMeter);
  });

  const egoLayout = $derived.by(() => {
    const m = new SvelteMap<number, { x: number; y: number; angle: number }>();
    if (viewMode !== 'ego') return m;
    const n = egoEdges.length;
    if (n === 0) return m;
    const radius = Math.min(SIZE / 2 - 80, 180 + Math.sqrt(n) * 22);
    egoEdges.forEach((e, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      m.set(e.otherIndex, {
        x: CENTER_X + Math.cos(a) * radius,
        y: CENTER_Y + Math.sin(a) * radius,
        angle: a,
      });
    });
    return m;
  });

  const focusName = $derived(mii && selectedIndex != null ? readMiiName(mii, selectedIndex) : '');

  function nameOf(idx: number): string {
    return mii ? readMiiName(mii, idx) : '';
  }

  let hoveredNode = $state<number | null>(null);
  let filterType = $state<string>('all');

  const presentTypes = $derived.by(() => {
    const s = new SvelteSet<string>();
    if (viewMode === 'all') {
      for (const p of allPairs) {
        if (!isHiddenType(p.typeAB)) s.add(p.typeAB);
        if (!isHiddenType(p.typeBA)) s.add(p.typeBA);
      }
    } else {
      for (const e of egoEdges) {
        if (!isHiddenType(e.outTypeName)) s.add(e.outTypeName);
        if (!isHiddenType(e.inTypeName)) s.add(e.inTypeName);
      }
    }
    return [...s].sort((a, b) => (GROUP_ORDER[a] ?? 99) - (GROUP_ORDER[b] ?? 99));
  });

  function onClickNode(idx: number) {
    onSelect(idx);
    if (viewMode === 'all') viewMode = 'ego';
  }

  const localizeRelationType = $derived((name: string) => localizeRelationTypeFor(name, $locale));
</script>

<section class={CARD_CLASS}>
  <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h3 class="text-base font-bold text-content-strong">{$_('mii.relations.graph_title')}</h3>
      <p class="mt-0.5 text-xs text-content-muted">
        {#if viewMode === 'all'}
          {$_('mii.relations.graph_intro_all', { values: { count: populated.length } })}
        {:else if selectedIndex == null}
          {$_('mii.relations.graph_intro_pick')}
        {:else}
          {$_('mii.relations.graph_intro_focus', { values: { name: focusName } })}
        {/if}
      </p>
    </div>
  </div>

  <MiiRelationsGraphControls
    {populated}
    {nameOf}
    enabled={!!re && populated.length > 0}
    {dropdownIndex}
    {viewMode}
    {presentTypes}
    {filterType}
    {localizeRelationType}
    onDropdownChange={(idx) => (dropdownIndex = idx)}
    onViewSelected={viewSelected}
    onViewAll={viewAll}
    onFilterChange={(v) => (filterType = v)}
  />

  {#if !re}
    <p class="text-sm text-content-muted">{$_('mii.relations.no_table')}</p>
  {:else if populated.length === 0}
    <p class="text-sm text-content-muted">{$_('mii.relations.no_populated')}</p>
  {:else if viewMode === 'all' && allPairs.length === 0}
    <p class="text-sm text-content-muted">{$_('mii.relations.no_pairs_visible')}</p>
  {:else if viewMode === 'ego' && selectedIndex != null && egoEdges.length === 0}
    <p class="text-sm text-content-muted">
      {$_('mii.relations.no_relations_for', { values: { name: focusName } })}
    </p>
  {:else}
    <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-content">
      {#each presentTypes as t (t)}
        <span
          class="inline-flex items-center gap-1.5"
          class:opacity-30={filterType !== 'all' && filterType !== t}
        >
          <span
            class="inline-block h-2 w-3 rounded-sm"
            style:background-color={TYPE_COLORS[t] ?? FALLBACK_COLOR}
          ></span>
          {localizeRelationType(t)}
        </span>
      {/each}
    </div>

    <div class="mt-4 overflow-auto">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        class="mx-auto block h-auto w-full max-w-190"
        role="img"
        aria-label={viewMode === 'all'
          ? $_('mii.relations.graph_aria_all')
          : $_('mii.relations.graph_aria_focus', { values: { name: focusName } })}
      >
        {#if viewMode === 'all'}
          <MiiRelationsGraphAllSvg
            pairs={allPairs}
            {populated}
            {nameOf}
            layout={allLayout}
            {filterType}
            {hoveredNode}
            {selectedIndex}
            {localizeRelationType}
            onHoverNode={(idx) => (hoveredNode = idx)}
            {onClickNode}
          />
        {:else if selectedIndex != null}
          <MiiRelationsGraphEgoSvg
            edges={egoEdges}
            layout={egoLayout}
            {focusName}
            {filterType}
            {hoveredNode}
            {localizeRelationType}
            onHoverNode={(idx) => (hoveredNode = idx)}
            {onClickNode}
          />
        {/if}
      </svg>
    </div>

    <p class="mt-3 text-xs text-content-muted">
      {#if viewMode === 'all'}
        {$_('mii.relations.pair_count', { values: { count: allPairs.length } })}
      {:else}
        {$_('mii.relations.relation_count', { values: { count: egoEdges.length } })}
      {/if}
      {#if filterType !== 'all'}
        ·
        {$_('mii.relations.filtered_to', {
          values: { filter: localizeRelationType(filterType) },
        })}
      {/if}
      · {$_('mii.relations.graph_footnote')}
    </p>
  {/if}
</section>
