<script lang="ts">
  import type { DataType } from '$lib/sav/dataType';
  import type { SchemaLeaf } from '$lib/sav/schema/leaf';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import { INPUT_CLASS } from '$lib/ui/styles';

  type UIntLeaf = SchemaLeaf<DataType.UInt>;

  type Props = { dayLeaf: UIntLeaf; monthLeaf: UIntLeaf; yearLeaf: UIntLeaf };
  let { dayLeaf, monthLeaf, yearLeaf }: Props = $props();

  function pad(n: number, w: number): string {
    return String(n).padStart(w, '0');
  }

  const isoValue = $derived.by(() => {
    const acc = playerAccessor();
    if (!acc) return '';
    const y = acc.get(yearLeaf);
    const m = acc.get(monthLeaf);
    const d = acc.get(dayLeaf);
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
    const acc = playerAccessor();
    if (!acc) return;
    acc.set(yearLeaf, y);
    acc.set(monthLeaf, mo);
    acc.set(dayLeaf, d);
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
