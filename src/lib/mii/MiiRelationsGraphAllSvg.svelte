<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { isHiddenType, type Pair } from './relationsModel';
  import { arrowGeometry, NODE_RADIUS, pairTooltip } from './relationsGraphHelpers';

  type Props = {
    pairs: Pair[];
    populated: number[];
    nameOf: (idx: number) => string;
    layout: Map<number, { x: number; y: number }>;
    filterType: string;
    hoveredNode: number | null;
    selectedIndex: number | null;
    localizeRelationType: (name: string) => string;
    onHoverNode: (idx: number | null) => void;
    onClickNode: (idx: number) => void;
  };

  let {
    pairs,
    populated,
    nameOf,
    layout,
    filterType,
    hoveredNode,
    selectedIndex,
    localizeRelationType,
    onHoverNode,
    onClickNode,
  }: Props = $props();
</script>

<g fill="none" stroke-linecap="round">
  {#each pairs as p (p.a + ',' + p.b)}
    {@const pa = layout.get(p.a)}
    {@const pb = layout.get(p.b)}
    {#if pa && pb}
      {@const showAB = !isHiddenType(p.typeAB)}
      {@const showBA = !isHiddenType(p.typeBA)}
      {@const matchesFilter =
        filterType === 'all' || p.typeAB === filterType || p.typeBA === filterType}
      {@const involved = hoveredNode == null || hoveredNode === p.a || hoveredNode === p.b}
      {@const op = matchesFilter ? (involved ? (hoveredNode == null ? 0.65 : 0.95) : 0.08) : 0.06}
      {@const ab = arrowGeometry(pa.x, pa.y, pb.x, pb.y, NODE_RADIUS, NODE_RADIUS)}
      {@const ba = arrowGeometry(pb.x, pb.y, pa.x, pa.y, NODE_RADIUS, NODE_RADIUS)}
      {@const tip = pairTooltip(
        p,
        localizeRelationType,
        $locale,
        $_('mii.relations.fight_marker_aria'),
      )}
      {#if showAB}
        <path d={ab.d} stroke={p.colorAB} stroke-width={1.4} opacity={op}>
          <title>{tip}</title>
        </path>
        <polygon points={ab.arrow} fill={p.colorAB} opacity={op} stroke="none"></polygon>
      {/if}
      {#if showBA}
        <path d={ba.d} stroke={p.colorBA} stroke-width={1.4} opacity={op}>
          <title>{tip}</title>
        </path>
        <polygon points={ba.arrow} fill={p.colorBA} opacity={op} stroke="none"></polygon>
      {/if}
    {/if}
  {/each}
</g>

<g>
  {#each populated as idx (idx)}
    {@const pos = layout.get(idx)}
    {#if pos}
      {@const isHover = hoveredNode === idx}
      {@const isSelected = idx === selectedIndex}
      {@const name = nameOf(idx)}
      <g
        role="button"
        tabindex="0"
        aria-label={$_('mii.relations.focus_on', { values: { name } })}
        onmouseenter={() => onHoverNode(idx)}
        onmouseleave={() => onHoverNode(null)}
        onfocus={() => onHoverNode(idx)}
        onblur={() => onHoverNode(null)}
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
          fill={isHover
            ? 'var(--color-surface-sunken)'
            : isSelected
              ? 'var(--color-surface-muted)'
              : 'var(--color-surface)'}
          stroke={isHover
            ? 'var(--color-brand-soft)'
            : isSelected
              ? 'var(--color-brand)'
              : 'var(--color-content-strong)'}
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
            fill="var(--color-content-strong)"
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
            fill="var(--color-content-muted)"
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
