<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { INPUT_CLASS } from '../styles';

  type Size = 'sm' | 'md';

  type Props = {
    value: number;
    onChange: (value: number) => void;
    size?: Size;
  };

  let { value, onChange, size = 'md' }: Props = $props();

  const btnClass = $derived(size === 'sm' ? 'h-6 w-6' : 'h-7 w-7');
  const inputClass = $derived(size === 'sm' ? 'w-14' : 'w-16');
  const iconClass = $derived(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3');
</script>

<div class="flex items-center gap-1">
  <button
    type="button"
    aria-label={$_('player.inventory.decrement')}
    class="qty-btn {btnClass} rounded-full border border-edge/60 bg-surface text-content transition-all duration-150 hover:scale-110 hover:border-orange-400 hover:bg-surface-muted active:scale-90 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:border-edge/60"
    disabled={value <= 0}
    onclick={() => onChange(value - 1)}
  >
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" class={iconClass}>
      <line
        x1="3"
        y1="8"
        x2="13"
        y2="8"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  </button>
  <input
    type="number"
    min="0"
    step="1"
    class="{INPUT_CLASS} {inputClass} text-center font-mono"
    {value}
    onchange={(e) => {
      const v = Number(e.currentTarget.value);
      if (Number.isFinite(v)) onChange(v);
    }}
  />
  <button
    type="button"
    aria-label={$_('player.inventory.increment')}
    class="qty-btn {btnClass} rounded-full border border-edge/60 bg-surface text-content transition-all duration-150 hover:scale-110 hover:border-orange-400 hover:bg-surface-muted active:scale-90"
    onclick={() => onChange(value + 1)}
  >
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" class={iconClass}>
      <line
        x1="3"
        y1="8"
        x2="13"
        y2="8"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
      <line
        x1="8"
        y1="3"
        x2="8"
        y2="13"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  </button>
</div>

<style>
  .qty-btn {
    display: grid;
    place-items: center;
  }
</style>
