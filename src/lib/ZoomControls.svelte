<script lang="ts">
  type Props = {
    value: number;
    min?: number;
    max?: number;
  };
  let { value = $bindable(), min = 4, max = 16 }: Props = $props();
</script>

<div class="inline-flex items-center gap-1 text-xs text-slate-700">
  <span class="mr-1 font-bold">Zoom</span>
  <div class="inline-flex overflow-hidden rounded-full ring-1 ring-amber-400/60">
    <button
      type="button"
      class="bg-white px-2.5 py-1.5 text-slate-700 hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-white"
      disabled={value <= min}
      onclick={() => (value = Math.max(min, value - 1))}
      aria-label="Zoom out"
    >
      −
    </button>
    <span
      class="border-x border-amber-400/60 bg-white px-2.5 py-1.5 font-mono text-slate-700 tabular-nums"
    >
      {value}x
    </span>
    <button
      type="button"
      class="bg-white px-2.5 py-1.5 text-slate-700 hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-white"
      disabled={value >= max}
      onclick={() => (value = Math.min(max, value + 1))}
      aria-label="Zoom in"
    >
      +
    </button>
  </div>
</div>
