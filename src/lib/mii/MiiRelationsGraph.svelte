<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS } from '../styles';
  import { miiState } from './miiEditor.svelte';
  import {
    baseRelationTypeLabel,
    findRelationEntries,
    listRelationships,
    populatedMiiIndices,
    readMiiName,
    subRelationLabel,
  } from './relations';
  import { computeForceLayout } from './forceLayout';

  type Props = {
    entries: Entry[];
    selectedIndex: number | null;
    onSelect: (miiIndex: number) => void;
  };
  let { entries, selectedIndex, onSelect }: Props = $props();
  const tick = $derived(miiState.tick);

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });
  const re = $derived(findRelationEntries(byHash));

  // ---- type colours ------------------------------------------------------

  const TYPE_COLORS: Record<string, string> = {
    Couple: '#e11d48',
    Lover: '#f43f5e',
    ExLover: '#9f1239',
    Divorce: '#7f1d1d',
    Friend: '#16a34a',
    ExFriend: '#a16207',
    Know: '#94a3b8',
    Other: '#cbd5e1',
    Parent: '#7c3aed',
    Child: '#a855f7',
    BrotherSisterOlder: '#2563eb',
    BrotherSisterYounger: '#0ea5e9',
    GrandParent: '#1d4ed8',
    GrandChild: '#3b82f6',
    Relative: '#0891b2',
    Invalid: '#e5e7eb',
  };
  const FALLBACK_COLOR = '#cbd5e1';

  const HIDDEN_TYPES = new Set(['Invalid', 'Other']);
  function isHiddenType(label: string): boolean {
    return HIDDEN_TYPES.has(label) || label.startsWith('0x');
  }

  const GROUP_ORDER: Record<string, number> = {
    Couple: 0,
    Lover: 1,
    ExLover: 2,
    Divorce: 3,
    Parent: 4,
    Child: 5,
    BrotherSisterOlder: 6,
    BrotherSisterYounger: 7,
    GrandParent: 8,
    GrandChild: 9,
    Relative: 10,
    Friend: 11,
    ExFriend: 12,
    Know: 13,
    Other: 14,
  };

  type Pair = {
    a: number;
    b: number;
    nameA: string;
    nameB: string;
    typeAB: string;
    typeBA: string;
    meterAB: number;
    meterBA: number;
    colorAB: string;
    colorBA: string;
    isFight: boolean;
  };

  const allPairs = $derived.by<Pair[]>(() => {
    void tick;
    if (!re) return [];
    const all = listRelationships(re);
    const out: Pair[] = [];
    for (const r of all) {
      const typeAB = baseRelationTypeLabel(r.typeAtoB);
      const typeBA = baseRelationTypeLabel(r.typeBtoA);
      if (isHiddenType(typeAB) && isHiddenType(typeBA)) continue;
      out.push({
        a: r.a,
        b: r.b,
        nameA: readMiiName(re.name, r.a),
        nameB: readMiiName(re.name, r.b),
        typeAB,
        typeBA,
        meterAB: r.meterAtoB,
        meterBA: r.meterBtoA,
        colorAB: TYPE_COLORS[typeAB] ?? FALLBACK_COLOR,
        colorBA: TYPE_COLORS[typeBA] ?? FALLBACK_COLOR,
        isFight: r.isFight,
      });
    }
    return out;
  });

  const populated = $derived(re ? populatedMiiIndices(re.name) : []);

  type ViewMode = 'all' | 'ego';

  let viewMode = $state<ViewMode>(untrack(() => (selectedIndex != null ? 'ego' : 'all')));

  let dropdownIndex = $state<number | null>(untrack(() => selectedIndex));
  $effect(() => {
    if (selectedIndex != null) dropdownIndex = selectedIndex;
  });

  const focusIndex = $derived(selectedIndex);

  function viewSelected() {
    if (dropdownIndex == null) return;
    onSelect(dropdownIndex);
    viewMode = 'ego';
  }
  function viewAll() {
    viewMode = 'all';
  }

  const SIZE = 720;
  const CENTER_X = SIZE / 2;
  const CENTER_Y = SIZE / 2;

  const allLayout = $derived.by<Map<number, { x: number; y: number }>>(() => {
    if (viewMode !== 'all') return new Map();
    void tick;
    const nodes = populated.map((idx) => ({ index: idx }));
    // Edges: one per pair (force layout doesn't care about direction).
    const edges = allPairs.map((p) => ({ a: p.a, b: p.b }));
    return computeForceLayout(nodes, edges, { size: SIZE });
  });

  const egoEdges = $derived.by(() => {
    if (viewMode !== 'ego' || focusIndex == null) return [];
    const list = allPairs
      .filter((p) => p.a === focusIndex || p.b === focusIndex)
      .map((p) => {
        const selfIsA = p.a === focusIndex;
        return {
          other: selfIsA ? p.b : p.a,
          otherName: selfIsA ? p.nameB : p.nameA,
          typeOut: selfIsA ? p.typeAB : p.typeBA,
          typeIn: selfIsA ? p.typeBA : p.typeAB,
          meterOut: selfIsA ? p.meterAB : p.meterBA,
          meterIn: selfIsA ? p.meterBA : p.meterAB,
          colorOut: selfIsA ? p.colorAB : p.colorBA,
          colorIn: selfIsA ? p.colorBA : p.colorAB,
          isFight: p.isFight,
        };
      });
    list.sort((a, b) => {
      const ga = GROUP_ORDER[a.typeOut] ?? 99;
      const gb = GROUP_ORDER[b.typeOut] ?? 99;
      if (ga !== gb) return ga - gb;
      return b.meterOut - a.meterOut;
    });
    return list;
  });

  const egoLayout = $derived.by(() => {
    const m = new SvelteMap<number, { x: number; y: number; angle: number }>();
    if (viewMode !== 'ego') return m;
    const n = egoEdges.length;
    if (n === 0) return m;
    const radius = Math.min(SIZE / 2 - 80, 180 + Math.sqrt(n) * 22);
    egoEdges.forEach((e, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      m.set(e.other, {
        x: CENTER_X + Math.cos(a) * radius,
        y: CENTER_Y + Math.sin(a) * radius,
        angle: a,
      });
    });
    return m;
  });

  const focusName = $derived(re && focusIndex != null ? readMiiName(re.name, focusIndex) : '');

  const NODE_RADIUS = 6;
  const NODE_RADIUS_FOCUS = 9;
  const ARROW_OFFSET = 10;
  const ARROW_SIZE = 7;
  const LANE = 5;
  const CURVE_BOW = 14;

  function arrowGeometry(
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    sourceRadius: number,
    targetRadius: number,
  ): { d: string; arrow: string } {
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const startTrim = sourceRadius + 2;
    const endTrim = targetRadius + ARROW_OFFSET - NODE_RADIUS;

    const startX = sx + ux * startTrim + nx * LANE;
    const startY = sy + uy * startTrim + ny * LANE;
    const endX = ex - ux * endTrim + nx * LANE;
    const endY = ey - uy * endTrim + ny * LANE;
    const midX = (sx + ex) / 2 + nx * (LANE + CURVE_BOW);
    const midY = (sy + ey) / 2 + ny * (LANE + CURVE_BOW);

    const d = `M${startX.toFixed(1)},${startY.toFixed(1)} Q${midX.toFixed(
      1,
    )},${midY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`;

    const tx = endX - midX;
    const ty = endY - midY;
    const tlen = Math.hypot(tx, ty) || 1;
    const tux = tx / tlen;
    const tuy = ty / tlen;
    const baseX = endX - tux * ARROW_SIZE;
    const baseY = endY - tuy * ARROW_SIZE;
    const px = -tuy * (ARROW_SIZE / 2);
    const py = tux * (ARROW_SIZE / 2);
    const arrow = `${endX.toFixed(1)},${endY.toFixed(1)} ${(baseX + px).toFixed(
      1,
    )},${(baseY + py).toFixed(1)} ${(baseX - px).toFixed(1)},${(baseY - py).toFixed(1)}`;

    return { d, arrow };
  }

  let hoveredNode = $state<number | null>(null);

  const presentTypes = $derived.by(() => {
    const s = new SvelteSet<string>();
    if (viewMode === 'all') {
      for (const p of allPairs) {
        if (!isHiddenType(p.typeAB)) s.add(p.typeAB);
        if (!isHiddenType(p.typeBA)) s.add(p.typeBA);
      }
    } else {
      for (const e of egoEdges) {
        if (!isHiddenType(e.typeOut)) s.add(e.typeOut);
        if (!isHiddenType(e.typeIn)) s.add(e.typeIn);
      }
    }
    return [...s].sort((a, b) => (GROUP_ORDER[a] ?? 99) - (GROUP_ORDER[b] ?? 99));
  });

  let filterType = $state<string>('all');

  function onClickNode(idx: number) {
    onSelect(idx);
    if (viewMode === 'all') {
      viewMode = 'ego';
    }
  }

  function feeling(type: string, meter: number, isFight: boolean): string {
    const sub = subRelationLabel(type, meter, isFight);
    return sub ? ` - ${sub}` : '';
  }

  function pairTooltip(p: Pair): string {
    const fight = p.isFight ? '\n⚔︎ currently fighting' : '';
    return `${p.nameA} → ${p.nameB}: ${p.typeAB} (${p.meterAB})${feeling(p.typeAB, p.meterAB, p.isFight)}\n${p.nameB} → ${p.nameA}: ${p.typeBA} (${p.meterBA})${feeling(p.typeBA, p.meterBA, p.isFight)}${fight}`;
  }
</script>

<section class={CARD_CLASS}>
  <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h3 class="text-base font-bold text-slate-900">Relationship graph</h3>
      <p class="mt-0.5 text-xs text-slate-600">
        {#if viewMode === 'all'}
          Force-directed view of every relationship between {populated.length}
          populated Miis. Click any node to focus on that Mii's connections.
        {:else if focusIndex == null}
          Pick a Mii below to centre the graph on them.
        {:else}
          Centred on <strong>{focusName}</strong>. Click any peripheral Mii to re-centre the graph
          on them.
        {/if}
      </p>
    </div>
  </div>

  <div
    class="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-amber-100/70 px-3 py-2.5 ring-1 ring-amber-400/40"
  >
    <label class="flex flex-col gap-1 text-xs text-slate-700">
      <span class="font-bold text-slate-900">Mii</span>
      <select
        class="min-w-50 rounded-lg border border-amber-400/60 bg-white px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        value={dropdownIndex ?? ''}
        onchange={(e) => {
          const n = Number.parseInt(e.currentTarget.value, 10);
          dropdownIndex = Number.isFinite(n) ? n : null;
        }}
        disabled={!re || populated.length === 0}
      >
        {#if dropdownIndex == null}
          <option value="" disabled>(select a Mii)</option>
        {/if}
        {#each populated as idx (idx)}
          <option value={idx}>
            #{idx + 1} · {re ? readMiiName(re.name, idx) : ''}
          </option>
        {/each}
      </select>
    </label>

    <button
      type="button"
      class="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-bold text-white shadow ring-2 ring-orange-600 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      disabled={dropdownIndex == null}
      onclick={viewSelected}
    >
      View relationships
    </button>

    <button
      type="button"
      class="rounded-full border border-amber-400/60 bg-white px-4 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-amber-50"
      class:!bg-amber-200={viewMode === 'all'}
      onclick={viewAll}
    >
      View all relationships
    </button>

    {#if presentTypes.length > 0}
      <label class="ml-auto flex flex-col gap-1 text-xs text-slate-700">
        <span class="font-bold text-slate-900">Filter type</span>
        <select
          class="rounded-lg border border-amber-400/60 bg-white px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          bind:value={filterType}
        >
          <option value="all">All types</option>
          {#each presentTypes as t (t)}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </label>
    {/if}
  </div>

  {#if !re}
    <p class="text-sm text-slate-600">Relationship tables aren't present in this save.</p>
  {:else if populated.length === 0}
    <p class="text-sm text-slate-600">No populated Miis to graph.</p>
  {:else if viewMode === 'all' && allPairs.length === 0}
    <p class="text-sm text-slate-600">
      No relationships to graph (every pair was hidden by the unknown/Invalid filter).
    </p>
  {:else if viewMode === 'ego' && focusIndex != null && egoEdges.length === 0}
    <p class="text-sm text-slate-600">
      <strong>{focusName}</strong> doesn't have any recorded relationships.
    </p>
  {:else}
    <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-700">
      {#each presentTypes as t (t)}
        <span
          class="inline-flex items-center gap-1.5"
          class:opacity-30={filterType !== 'all' && filterType !== t}
        >
          <span
            class="inline-block h-2 w-3 rounded-sm"
            style:background-color={TYPE_COLORS[t] ?? FALLBACK_COLOR}
          ></span>
          {t}
        </span>
      {/each}
    </div>

    <div class="mt-4 overflow-auto">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        class="mx-auto block h-auto w-full max-w-190"
        role="img"
        aria-label={viewMode === 'all' ? 'All Mii relationships' : `Relationships for ${focusName}`}
      >
        {#if viewMode === 'all'}
          <g fill="none" stroke-linecap="round">
            {#each allPairs as p (p.a + ',' + p.b)}
              {@const pa = allLayout.get(p.a)}
              {@const pb = allLayout.get(p.b)}
              {#if pa && pb}
                {@const showAB = !isHiddenType(p.typeAB)}
                {@const showBA = !isHiddenType(p.typeBA)}
                {@const matchesFilter =
                  filterType === 'all' || p.typeAB === filterType || p.typeBA === filterType}
                {@const involved =
                  hoveredNode == null || hoveredNode === p.a || hoveredNode === p.b}
                {@const op = matchesFilter
                  ? involved
                    ? hoveredNode == null
                      ? 0.65
                      : 0.95
                    : 0.08
                  : 0.06}
                {@const ab = arrowGeometry(pa.x, pa.y, pb.x, pb.y, NODE_RADIUS, NODE_RADIUS)}
                {@const ba = arrowGeometry(pb.x, pb.y, pa.x, pa.y, NODE_RADIUS, NODE_RADIUS)}
                {#if showAB}
                  <path d={ab.d} stroke={p.colorAB} stroke-width={1.4} opacity={op}>
                    <title>{pairTooltip(p)}</title>
                  </path>
                  <polygon points={ab.arrow} fill={p.colorAB} opacity={op} stroke="none"></polygon>
                {/if}
                {#if showBA}
                  <path d={ba.d} stroke={p.colorBA} stroke-width={1.4} opacity={op}>
                    <title>{pairTooltip(p)}</title>
                  </path>
                  <polygon points={ba.arrow} fill={p.colorBA} opacity={op} stroke="none"></polygon>
                {/if}
              {/if}
            {/each}
          </g>

          <g>
            {#each populated as idx (idx)}
              {@const pos = allLayout.get(idx)}
              {#if pos}
                {@const isHover = hoveredNode === idx}
                {@const isSelected = idx === selectedIndex}
                {@const name = re ? readMiiName(re.name, idx) : ''}
                <g
                  role="button"
                  tabindex="0"
                  aria-label={`Focus on ${name}`}
                  onmouseenter={() => (hoveredNode = idx)}
                  onmouseleave={() => (hoveredNode = null)}
                  onfocus={() => (hoveredNode = idx)}
                  onblur={() => (hoveredNode = null)}
                  onclick={() => onClickNode(idx)}
                  onkeydown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      onClickNode(idx);
                    }
                  }}
                  class="cursor-pointer"
                >
                  <circle cx={pos.x} cy={pos.y} r={14} fill="transparent"></circle>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isHover || isSelected ? 7 : NODE_RADIUS}
                    fill={isHover ? '#fef3c7' : isSelected ? '#dbeafe' : '#fff'}
                    stroke={isHover ? '#b45309' : isSelected ? '#1d4ed8' : '#1f2937'}
                    stroke-width={isHover || isSelected ? 2 : 1.25}
                    pointer-events="none"
                  ></circle>
                  {#if isHover}
                    <text
                      x={pos.x}
                      y={pos.y - 12}
                      text-anchor="middle"
                      font-size="12"
                      font-weight="600"
                      fill="#1f2937"
                      style="pointer-events:none; user-select:none;"
                    >
                      {name}
                    </text>
                  {:else}
                    <text
                      x={pos.x}
                      y={pos.y + 18}
                      text-anchor="middle"
                      font-size="10"
                      fill="#475569"
                      opacity={populated.length > 40 ? 0.55 : 0.85}
                      style="pointer-events:none; user-select:none;"
                    >
                      {name}
                    </text>
                  {/if}
                </g>
              {/if}
            {/each}
          </g>
        {:else if focusIndex != null}
          <g fill="none" stroke-linecap="round">
            {#each egoEdges as e (e.other)}
              {@const p = egoLayout.get(e.other)}
              {#if p}
                {@const matches =
                  filterType === 'all' || e.typeOut === filterType || e.typeIn === filterType}
                {@const showOut = !isHiddenType(e.typeOut)}
                {@const showIn = !isHiddenType(e.typeIn)}
                {@const dim = !matches
                  ? 0.08
                  : hoveredNode != null && hoveredNode !== e.other
                    ? 0.18
                    : hoveredNode == null
                      ? 0.85
                      : 1}
                {@const out = arrowGeometry(
                  CENTER_X,
                  CENTER_Y,
                  p.x,
                  p.y,
                  NODE_RADIUS_FOCUS,
                  NODE_RADIUS,
                )}
                {@const inn = arrowGeometry(
                  p.x,
                  p.y,
                  CENTER_X,
                  CENTER_Y,
                  NODE_RADIUS,
                  NODE_RADIUS_FOCUS,
                )}
                {@const tip = `${focusName} → ${e.otherName}: ${e.typeOut} (${e.meterOut})${feeling(e.typeOut, e.meterOut, e.isFight)}\n${e.otherName} → ${focusName}: ${e.typeIn} (${e.meterIn})${feeling(e.typeIn, e.meterIn, e.isFight)}${e.isFight ? '\n⚔︎ currently fighting' : ''}`}

                {#if showOut}
                  <path d={out.d} stroke={e.colorOut} stroke-width={1.6} opacity={dim}>
                    <title>{tip}</title>
                  </path>
                  <polygon points={out.arrow} fill={e.colorOut} opacity={dim} stroke="none"
                  ></polygon>
                {/if}
                {#if showIn}
                  <path d={inn.d} stroke={e.colorIn} stroke-width={1.6} opacity={dim}>
                    <title>{tip}</title>
                  </path>
                  <polygon points={inn.arrow} fill={e.colorIn} opacity={dim} stroke="none"
                  ></polygon>
                {/if}

                {@const subOut = subRelationLabel(e.typeOut, e.meterOut, e.isFight)}
                {@const subIn = subRelationLabel(e.typeIn, e.meterIn, e.isFight)}
                {@const labelOut =
                  (subOut ?? e.typeOut) + (e.meterOut !== 0 ? ` (${e.meterOut})` : '')}
                {@const labelIn = (subIn ?? e.typeIn) + (e.meterIn !== 0 ? ` (${e.meterIn})` : '')}
                {@const symmetric =
                  showOut && showIn && labelOut === labelIn && e.colorOut === e.colorIn}
                {#if symmetric}
                  {@const mx = CENTER_X + (p.x - CENTER_X) * 0.5}
                  {@const my = CENTER_Y + (p.y - CENTER_Y) * 0.5}
                  <text
                    x={mx}
                    y={my}
                    text-anchor="middle"
                    font-size="9.5"
                    fill={e.colorOut}
                    opacity={dim}
                    style="pointer-events:none; user-select:none; paint-order:stroke; stroke:#fff; stroke-width:3;"
                  >
                    {labelOut}
                  </text>
                {:else}
                  {#if showOut}
                    {@const ox = CENTER_X + (p.x - CENTER_X) * 0.68}
                    {@const oy = CENTER_Y + (p.y - CENTER_Y) * 0.68}
                    <text
                      x={ox}
                      y={oy}
                      text-anchor="middle"
                      font-size="9.5"
                      fill={e.colorOut}
                      opacity={dim}
                      style="pointer-events:none; user-select:none; paint-order:stroke; stroke:#fff; stroke-width:3;"
                    >
                      {labelOut}
                    </text>
                  {/if}
                  {#if showIn}
                    {@const ix = CENTER_X + (p.x - CENTER_X) * 0.32}
                    {@const iy = CENTER_Y + (p.y - CENTER_Y) * 0.32}
                    <text
                      x={ix}
                      y={iy}
                      text-anchor="middle"
                      font-size="9.5"
                      fill={e.colorIn}
                      opacity={dim}
                      style="pointer-events:none; user-select:none; paint-order:stroke; stroke:#fff; stroke-width:3;"
                    >
                      {labelIn}
                    </text>
                  {/if}
                {/if}
              {/if}
            {/each}
          </g>

          <g>
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={NODE_RADIUS_FOCUS}
              fill="#fef3c7"
              stroke="#b45309"
              stroke-width={2}
            ></circle>
            <text
              x={CENTER_X}
              y={CENTER_Y - 16}
              text-anchor="middle"
              font-size="13"
              font-weight="600"
              fill="#1f2937"
              style="pointer-events:none; user-select:none;"
            >
              {focusName}
            </text>
          </g>

          <g>
            {#each egoEdges as e (e.other)}
              {@const p = egoLayout.get(e.other)}
              {#if p}
                {@const isHover = hoveredNode === e.other}
                {@const labelX = CENTER_X + (p.x - CENTER_X) * 1.08}
                {@const labelY = CENTER_Y + (p.y - CENTER_Y) * 1.08 + 4}
                <g
                  role="button"
                  tabindex="0"
                  aria-label={`Focus on ${e.otherName}`}
                  onmouseenter={() => (hoveredNode = e.other)}
                  onmouseleave={() => (hoveredNode = null)}
                  onfocus={() => (hoveredNode = e.other)}
                  onblur={() => (hoveredNode = null)}
                  onclick={() => onClickNode(e.other)}
                  onkeydown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      onClickNode(e.other);
                    }
                  }}
                  class="cursor-pointer"
                >
                  <circle cx={p.x} cy={p.y} r={16} fill="transparent"></circle>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHover ? 7 : NODE_RADIUS}
                    fill={isHover ? '#fef3c7' : '#fff'}
                    stroke={isHover ? '#b45309' : '#1f2937'}
                    stroke-width={isHover ? 2 : 1.25}
                    pointer-events="none"
                  ></circle>
                  <text
                    x={labelX}
                    y={labelY}
                    text-anchor="middle"
                    font-size="11"
                    fill="#1f2937"
                    style="pointer-events:none; user-select:none;"
                  >
                    {e.otherName}
                  </text>
                  {#if e.isFight}
                    <text
                      x={p.x}
                      y={p.y + 3}
                      text-anchor="middle"
                      font-size="10"
                      fill="#dc2626"
                      style="pointer-events:none; user-select:none;"
                    >
                      ⚔
                    </text>
                  {/if}
                </g>
              {/if}
            {/each}
          </g>
        {/if}
      </svg>
    </div>

    <p class="mt-3 text-xs text-slate-600">
      {#if viewMode === 'all'}
        {allPairs.length} pair{allPairs.length === 1 ? '' : 's'}
      {:else}
        {egoEdges.length} relationship{egoEdges.length === 1 ? '' : 's'}
      {/if}
      {#if filterType !== 'all'}· filtered to <strong>{filterType}</strong>{/if}
      · Other (default "haven't met"), Invalid and unknown types are hidden.
    </p>
  {/if}
</section>
