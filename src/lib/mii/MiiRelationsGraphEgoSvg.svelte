<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { isHiddenType, type EgoEdge } from './relationsModel';
  import {
    arrowGeometry,
    CENTER_X,
    CENTER_Y,
    egoEdgeTooltip,
    localizedSub,
    NODE_RADIUS,
    NODE_RADIUS_FOCUS,
  } from './relationsGraphHelpers';

  type Props = {
    edges: EgoEdge[];
    layout: Map<number, { x: number; y: number; angle: number }>;
    focusName: string;
    filterType: string;
    hoveredNode: number | null;
    localizeRelationType: (name: string) => string;
    onHoverNode: (idx: number | null) => void;
    onClickNode: (idx: number) => void;
  };

  let {
    edges,
    layout,
    focusName,
    filterType,
    hoveredNode,
    localizeRelationType,
    onHoverNode,
    onClickNode,
  }: Props = $props();
</script>

<g fill="none" stroke-linecap="round">
  {#each edges as e (e.otherIndex)}
    {@const p = layout.get(e.otherIndex)}
    {#if p}
      {@const matches =
        filterType === 'all' || e.outTypeName === filterType || e.inTypeName === filterType}
      {@const showOut = !isHiddenType(e.outTypeName)}
      {@const showIn = !isHiddenType(e.inTypeName)}
      {@const dim = !matches
        ? 0.08
        : hoveredNode != null && hoveredNode !== e.otherIndex
          ? 0.18
          : hoveredNode == null
            ? 0.85
            : 1}
      {@const out = arrowGeometry(CENTER_X, CENTER_Y, p.x, p.y, NODE_RADIUS_FOCUS, NODE_RADIUS)}
      {@const inn = arrowGeometry(p.x, p.y, CENTER_X, CENTER_Y, NODE_RADIUS, NODE_RADIUS_FOCUS)}
      {@const tip = egoEdgeTooltip(
        focusName,
        e,
        localizeRelationType,
        $locale,
        $_('mii.relations.fight_marker_aria'),
      )}

      {#if showOut}
        <path d={out.d} stroke={e.colorOut} stroke-width={1.6} opacity={dim}>
          <title>{tip}</title>
        </path>
        <polygon points={out.arrow} fill={e.colorOut} opacity={dim} stroke="none"></polygon>
      {/if}
      {#if showIn}
        <path d={inn.d} stroke={e.colorIn} stroke-width={1.6} opacity={dim}>
          <title>{tip}</title>
        </path>
        <polygon points={inn.arrow} fill={e.colorIn} opacity={dim} stroke="none"></polygon>
      {/if}

      {@const subOut = localizedSub(e.outTypeName, e.outMeter, e.isFight, $locale)}
      {@const subIn = localizedSub(e.inTypeName, e.inMeter, e.isFight, $locale)}
      {@const labelOut =
        (subOut ?? localizeRelationType(e.outTypeName)) +
        (e.outMeter !== 0 ? ` (${e.outMeter})` : '')}
      {@const labelIn =
        (subIn ?? localizeRelationType(e.inTypeName)) + (e.inMeter !== 0 ? ` (${e.inMeter})` : '')}
      {@const symmetric = showOut && showIn && labelOut === labelIn && e.colorOut === e.colorIn}
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
          style="pointer-events:none; user-select:none; paint-order:stroke; stroke:var(--color-surface); stroke-width:3;"
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
            style="pointer-events:none; user-select:none; paint-order:stroke; stroke:var(--color-surface); stroke-width:3;"
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
            style="pointer-events:none; user-select:none; paint-order:stroke; stroke:var(--color-surface); stroke-width:3;"
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
    fill="var(--color-surface-sunken)"
    stroke="var(--color-brand-soft)"
    stroke-width={2}
  ></circle>
  <text
    x={CENTER_X}
    y={CENTER_Y - 16}
    text-anchor="middle"
    font-size="13"
    font-weight="600"
    fill="var(--color-content-strong)"
    style="pointer-events:none; user-select:none;"
  >
    {focusName}
  </text>
</g>

<g>
  {#each edges as e (e.otherIndex)}
    {@const p = layout.get(e.otherIndex)}
    {#if p}
      {@const isHover = hoveredNode === e.otherIndex}
      {@const labelX = CENTER_X + (p.x - CENTER_X) * 1.08}
      {@const labelY = CENTER_Y + (p.y - CENTER_Y) * 1.08 + 4}
      <g
        role="button"
        tabindex="0"
        aria-label={$_('mii.relations.focus_on', { values: { name: e.otherName } })}
        onmouseenter={() => onHoverNode(e.otherIndex)}
        onmouseleave={() => onHoverNode(null)}
        onfocus={() => onHoverNode(e.otherIndex)}
        onblur={() => onHoverNode(null)}
        onclick={() => onClickNode(e.otherIndex)}
        onkeydown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            onClickNode(e.otherIndex);
          }
        }}
        class="cursor-pointer"
      >
        <circle cx={p.x} cy={p.y} r={16} fill="transparent"></circle>
        <circle
          cx={p.x}
          cy={p.y}
          r={isHover ? 7 : NODE_RADIUS}
          fill={isHover ? 'var(--color-surface-sunken)' : 'var(--color-surface)'}
          stroke={isHover ? 'var(--color-brand-soft)' : 'var(--color-content-strong)'}
          stroke-width={isHover ? 2 : 1.25}
          pointer-events="none"
        ></circle>
        <text
          x={labelX}
          y={labelY}
          text-anchor="middle"
          font-size="11"
          fill="var(--color-content-strong)"
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
