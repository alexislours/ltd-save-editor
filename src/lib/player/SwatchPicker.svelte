<script lang="ts">
  import type { Swatch } from './profileFields';

  type Props = {
    swatches: Swatch[];
    value: number;
    onChange: (next: number) => void;
  };
  let { swatches, value, onChange }: Props = $props();

  const selectedIndex = $derived(
    Math.max(
      0,
      swatches.findIndex((s) => s.value === value),
    ),
  );
  const current = $derived(swatches.find((s) => s.value === value) ?? swatches[0]);

  function move(delta: number) {
    const n = swatches.length;
    if (n === 0) return;
    const next = (selectedIndex + delta + n) % n;
    onChange(swatches[next].value);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    }
  }
</script>

<div class="flex flex-col gap-2">
  <div
    class="flex items-center gap-2"
    role="radiogroup"
    aria-label="Hand skin tone"
    tabindex="-1"
    onkeydown={onKeydown}
  >
    {#each swatches as s (s.value)}
      {@const selected = s.value === value}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={s.label}
        title={s.label}
        tabindex={selected ? 0 : -1}
        class={[
          'h-8 w-8 rounded-full border-2 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-orange-500/40',
          selected
            ? 'border-orange-500 ring-2 ring-orange-500'
            : 'border-edge/60 hover:border-orange-400',
        ]}
        style:background-color={s.color}
        onclick={() => onChange(s.value)}
      ></button>
    {/each}
  </div>
  {#if current}
    <span class="text-xs text-content-muted">{current.label}</span>
  {/if}
</div>
