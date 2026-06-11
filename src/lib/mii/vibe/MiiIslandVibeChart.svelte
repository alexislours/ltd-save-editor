<script lang="ts">
  import { OCTANT_CATEGORY, OCTANT_COLORS, vibeOctant, type IslandVibe } from './islandVibe';

  type Props = {
    vibe: IslandVibe;
    ariaLabel: string;
    vibeLabel: (key: string) => string;
    categoryLabel: (key: string) => string;
    nameOf: (index: number) => string;
  };
  let { vibe, ariaLabel, vibeLabel, categoryLabel, nameOf }: Props = $props();

  const SIZE = 680;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const UNIT = 134;
  const OUTER = 2 * UNIT;
  const INNER = (2 / 3) * UNIT;

  function valuePoint(vx: number, vy: number): { x: number; y: number } {
    return { x: CX + vx * UNIT, y: CY - vy * UNIT };
  }

  function rayPoint(deg: number, distance: number): { x: number; y: number } {
    const a = (deg * Math.PI) / 180;
    return { x: CX + distance * Math.cos(a), y: CY - distance * Math.sin(a) };
  }

  function boundaryDistance(deg: number, half: number): number {
    const a = (deg * Math.PI) / 180;
    return half / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
  }

  function squarePoint(deg: number, half: number): { x: number; y: number } {
    return rayPoint(deg, boundaryDistance(deg, half));
  }

  function toPath(points: { x: number; y: number }[]): string {
    return `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
  }

  function weakPath(o: number): string {
    const c = o * 45;
    const points = [{ x: CX, y: CY }, squarePoint(c - 22.5, INNER)];
    if (o % 2 === 1) points.push(squarePoint(c, INNER));
    points.push(squarePoint(c + 22.5, INNER));
    return toPath(points);
  }

  function strongPath(o: number): string {
    const c = o * 45;
    const points = [squarePoint(c - 22.5, INNER), squarePoint(c - 22.5, OUTER)];
    if (o % 2 === 1) points.push(squarePoint(c, OUTER));
    points.push(squarePoint(c + 22.5, OUTER), squarePoint(c + 22.5, INNER));
    if (o % 2 === 1) points.push(squarePoint(c, INNER));
    return toPath(points);
  }

  function splitLabel(label: string): string[] {
    if (label.length <= 13) return [label];
    const words = label.split(' ');
    if (words.length < 2) return [label];
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ').length;
      const b = words.slice(i).join(' ').length;
      const diff = Math.abs(a - b);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }

  const octants = $derived(
    Array.from({ length: 8 }, (_, o) => {
      const c = o * 45;
      const category = OCTANT_CATEGORY[o];
      return {
        o,
        color: OCTANT_COLORS[o],
        weakPath: weakPath(o),
        strongPath: strongPath(o),
        weakKey: `Weak_0${o}`,
        strongKey: `Strong_0${o}`,
        strongLabelPos: rayPoint(c, (boundaryDistance(c, INNER) + boundaryDistance(c, OUTER)) / 2),
        weakLabelPos: rayPoint(c, boundaryDistance(c, INNER) * 0.62),
        categoryPos: category ? rayPoint(c, boundaryDistance(c, OUTER) + 26) : null,
        category,
      };
    }),
  );

  const residentDots = $derived.by(() => {
    const groups: Record<string, { cx: number; cy: number; indices: number[] }> = {};
    for (const r of vibe.residents) {
      const key = `${r.cx},${r.cy}`;
      (groups[key] ??= { cx: r.cx, cy: r.cy, indices: [] }).indices.push(r.index);
    }
    return Object.values(groups).map((g) => ({
      ...g,
      ...valuePoint(g.cx, g.cy),
      color: OCTANT_COLORS[vibeOctant(g.cx, g.cy)],
    }));
  });

  const vector = $derived.by(() => {
    if (vibe.octant == null || vibe.angleDeg == null || vibe.residentCount === 0) return null;
    const tip = valuePoint(vibe.sx / vibe.residentCount, vibe.sy / vibe.residentCount);
    const len = Math.hypot(tip.x - CX, tip.y - CY);
    if (len === 0) return null;
    const ux = (tip.x - CX) / len;
    const uy = (tip.y - CY) / len;
    const nx = -uy;
    const ny = ux;
    const head = Math.min(16, Math.max(9, len * 0.45), len);
    const headHalf = head * 0.5;
    const shaftHalf = 2.75;
    const bx = tip.x - ux * head;
    const by = tip.y - uy * head;
    const points = [
      [CX + nx * shaftHalf, CY + ny * shaftHalf],
      [bx + nx * shaftHalf, by + ny * shaftHalf],
      [bx + nx * headHalf, by + ny * headHalf],
      [tip.x, tip.y],
      [bx - nx * headHalf, by - ny * headHalf],
      [bx - nx * shaftHalf, by - ny * shaftHalf],
      [CX - nx * shaftHalf, CY - ny * shaftHalf],
    ]
      .map((p) => p.join(','))
      .join(' ');
    return { points, ray: squarePoint(vibe.angleDeg, OUTER) };
  });

  const activeWeakOctant = $derived(vibe.strength === 'weak' ? vibe.octant : null);

  const TEXT_HALO =
    'pointer-events:none; user-select:none; paint-order:stroke; stroke:var(--color-surface); stroke-width:3.5;';
</script>

<svg
  viewBox={`0 0 ${SIZE} ${SIZE}`}
  class="mx-auto block h-auto w-full max-w-170"
  role="img"
  aria-label={ariaLabel}
>
  {#each octants as cell (cell.o)}
    {@const activeWeak = vibe.strength === 'weak' && vibe.octant === cell.o}
    {@const activeStrong = vibe.strength === 'strong' && vibe.octant === cell.o}
    <path
      d={cell.weakPath}
      fill={cell.color}
      fill-opacity={activeWeak ? 0.5 : 0.13}
      stroke={activeWeak ? cell.color : 'none'}
      stroke-width={activeWeak ? 2.5 : 0}
    >
      <title>{vibeLabel(cell.weakKey)}</title>
    </path>
    <path
      d={cell.strongPath}
      fill={cell.color}
      fill-opacity={activeStrong ? 0.5 : 0.22}
      stroke={activeStrong ? cell.color : 'none'}
      stroke-width={activeStrong ? 2.5 : 0}
    >
      <title>{vibeLabel(cell.strongKey)}</title>
    </path>
  {/each}

  {#each octants as cell (cell.o)}
    {@const p1 = squarePoint(cell.o * 45 + 22.5, INNER * 0.12)}
    {@const p2 = squarePoint(cell.o * 45 + 22.5, OUTER)}
    <line
      x1={p1.x}
      y1={p1.y}
      x2={p2.x}
      y2={p2.y}
      stroke="var(--color-surface)"
      stroke-width="2"
      opacity="0.8"
    ></line>
  {/each}
  <rect
    x={CX - OUTER}
    y={CY - OUTER}
    width={OUTER * 2}
    height={OUTER * 2}
    fill="none"
    stroke="var(--color-content-muted)"
    stroke-width="1.5"
    opacity="0.5"
  ></rect>
  <rect
    x={CX - INNER}
    y={CY - INNER}
    width={INNER * 2}
    height={INNER * 2}
    fill="none"
    stroke="var(--color-content-muted)"
    stroke-width="1.5"
    stroke-dasharray="6 5"
    opacity="0.75"
  ></rect>

  {#each octants as cell (cell.o)}
    {@const activeStrong = vibe.strength === 'strong' && vibe.octant === cell.o}
    {@const lines = splitLabel(vibeLabel(cell.strongKey))}
    {#each lines as line, li (li)}
      <text
        x={cell.strongLabelPos.x}
        y={cell.strongLabelPos.y + li * 13 - (lines.length - 1) * 6.5}
        text-anchor="middle"
        font-size={activeStrong ? 13 : 11.5}
        font-weight={activeStrong ? 700 : 500}
        fill={activeStrong ? 'var(--color-content-strong)' : cell.color}
        style={TEXT_HALO}
      >
        {line}
      </text>
    {/each}
    {#if cell.category && cell.categoryPos}
      <text
        x={cell.categoryPos.x}
        y={cell.categoryPos.y}
        text-anchor="middle"
        font-size="12.5"
        font-weight="700"
        fill={cell.color}
        style={TEXT_HALO}
      >
        {categoryLabel(cell.category)}
      </text>
    {/if}
  {/each}

  {#if activeWeakOctant != null}
    {@const cell = octants[activeWeakOctant]}
    {@const lines = splitLabel(vibeLabel(cell.weakKey))}
    {#each lines as line, li (li)}
      <text
        x={cell.weakLabelPos.x}
        y={cell.weakLabelPos.y + li * 13 - (lines.length - 1) * 6.5}
        text-anchor="middle"
        font-size="13"
        font-weight="700"
        fill="var(--color-content-strong)"
        style={TEXT_HALO}
      >
        {line}
      </text>
    {/each}
  {/if}

  {#each residentDots as dot (`${dot.cx},${dot.cy}`)}
    <g>
      <title
        >{`${dot.indices.map(nameOf).join(', ')} (${dot.cx > 0 ? '+' : ''}${dot.cx}, ${dot.cy > 0 ? '+' : ''}${dot.cy})`}</title
      >
      <circle
        cx={dot.x}
        cy={dot.y}
        r={dot.indices.length > 1 ? 9 : 5.5}
        fill={dot.color}
        stroke="var(--color-surface)"
        stroke-width="1.5"
        opacity="0.92"
      ></circle>
      {#if dot.indices.length > 1}
        <text
          x={dot.x}
          y={dot.y}
          text-anchor="middle"
          dominant-baseline="central"
          font-size="9.5"
          font-weight="700"
          fill="white"
          style="pointer-events:none; user-select:none;"
        >
          {dot.indices.length}
        </text>
      {/if}
    </g>
  {/each}

  {#if vector}
    {@const color = OCTANT_COLORS[vibe.octant ?? 0]}
    <line
      x1={CX}
      y1={CY}
      x2={vector.ray.x}
      y2={vector.ray.y}
      stroke={color}
      stroke-width="1.5"
      stroke-dasharray="3 6"
      opacity="0.6"
    ></line>
    <polygon
      points={vector.points}
      fill={color}
      stroke="var(--color-surface)"
      stroke-width="2.5"
      stroke-linejoin="round"
      paint-order="stroke"
      style="filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.35));"
    >
      <title>{`(SX, SY) = (${vibe.sx}, ${vibe.sy})`}</title>
    </polygon>
  {/if}

  <circle
    cx={CX}
    cy={CY}
    r={vibe.strength === 'normal' ? 7 : 4.5}
    fill="var(--color-surface)"
    stroke={vibe.strength === 'normal'
      ? 'var(--color-content-strong)'
      : 'var(--color-content-muted)'}
    stroke-width={vibe.strength === 'normal' ? 2.5 : 1.5}
  >
    <title>{vibeLabel('Normal')}</title>
  </circle>
  {#if vibe.strength === 'normal'}
    <text
      x={CX}
      y={CY + 24}
      text-anchor="middle"
      font-size="13"
      font-weight="700"
      fill="var(--color-content-strong)"
      style={TEXT_HALO}
    >
      {vibeLabel('Normal')}
    </text>
  {/if}
</svg>
