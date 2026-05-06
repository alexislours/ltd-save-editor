<script lang="ts">
  type Props = {
    value: number;
    min?: number;
    max?: number;
  };
  let { value = $bindable(), min = 4, max = 16 }: Props = $props();
</script>

<div class="inline-flex items-center gap-1 text-xs text-content">
  <span class="mr-1 font-bold">Zoom</span>
  <div class="inline-flex overflow-hidden rounded-full ring-1 ring-edge/60">
    <button
      type="button"
      class="bg-surface px-2.5 py-1.5 text-content hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-surface"
      disabled={value <= min}
      onclick={() => (value = Math.max(min, value - 1))}
      aria-label="Zoom out"
    >
      −
    </button>
    <span
      class="border-x border-edge/60 bg-surface px-2.5 py-1.5 font-mono text-content tabular-nums"
    >
      {value}x
    </span>
    <button
      type="button"
      class="bg-surface px-2.5 py-1.5 text-content hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-surface"
      disabled={value >= max}
      onclick={() => (value = Math.min(max, value + 1))}
      aria-label="Zoom in"
    >
      +
    </button>
  </div>
</div>
