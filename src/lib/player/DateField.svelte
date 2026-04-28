<script lang="ts">
  import { getUInt, setUInt } from '../sav/codec';
  import type { Entry } from '../sav/types';
  import { markDirty } from '../playerEditor.svelte';
  import { INPUT_CLASS } from '../styles';

  type Props = { day: Entry; month: Entry; year: Entry };
  let { day, month, year }: Props = $props();

  let tick = $state(0);

  function pad(n: number, w: number): string {
    return String(n).padStart(w, '0');
  }

  const isoValue = $derived.by(() => {
    void tick;
    const y = getUInt(year);
    const m = getUInt(month);
    const d = getUInt(day);
    if (y === 0 || m === 0 || d === 0) return '';
    if (m < 1 || m > 12 || d < 1 || d > 31) return '';
    return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
  });

  let error = $state<string | null>(null);

  function onChange(iso: string): void {
    error = null;
    if (!iso) return;
    const m = iso.match(/^(\d{1,4})-(\d{2})-(\d{2})$/);
    if (!m) {
      error = 'Expected YYYY-MM-DD';
      return;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
      error = 'Invalid date';
      return;
    }
    setUInt(year, y);
    setUInt(month, mo);
    setUInt(day, d);
    markDirty(year);
    markDirty(month);
    markDirty(day);
    tick++;
  }
</script>

<div class="flex flex-col gap-1">
  <input
    type="date"
    class="w-full max-w-44 {INPUT_CLASS}"
    value={isoValue}
    onchange={(e) => onChange(e.currentTarget.value)}
  />
  {#if error}
    <span class="text-xs text-danger">{error}</span>
  {/if}
</div>
