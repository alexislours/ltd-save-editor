<script lang="ts">
  import { getTheme } from '$lib/theme/theme.svelte';
  import { getTilePattern, PATTERN_SIZE, refreshTilePatternSaturation } from './tilePatterns';

  type Props = {
    hash: number;
    class?: string;
  };

  let { hash, class: className = '' }: Props = $props();

  let satRev = $state(0);

  $effect(() => {
    void getTheme();
    if (refreshTilePatternSaturation()) satRev++;
  });

  const cells = $derived.by(() => {
    void satRev;
    const arr = getTilePattern(hash >>> 0);
    const out: string[] = new Array(PATTERN_SIZE * PATTERN_SIZE);
    for (let y = 0; y < PATTERN_SIZE; y++) {
      for (let x = 0; x < PATTERN_SIZE; x++) {
        const v = arr[(x << 2) | y];
        const r = v & 0xff;
        const g = (v >>> 8) & 0xff;
        const b = (v >>> 16) & 0xff;
        out[y * PATTERN_SIZE + x] = `rgb(${r}, ${g}, ${b})`;
      }
    }
    return out;
  });
</script>

<svg
  viewBox="0 0 {PATTERN_SIZE} {PATTERN_SIZE}"
  preserveAspectRatio="none"
  class={className}
  shape-rendering="crispEdges"
  aria-hidden="true"
>
  {#each cells as fill, i (i)}
    <rect x={i % PATTERN_SIZE} y={Math.floor(i / PATTERN_SIZE)} width="1" height="1" {fill} />
  {/each}
</svg>
