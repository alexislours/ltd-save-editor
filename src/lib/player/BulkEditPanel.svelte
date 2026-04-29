<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { track } from '../analytics';
  import { INPUT_CLASS, PILL_BUTTON_CLASS } from '../styles';
  import { STATE_OPTIONS } from './stateOptions';

  type Props = {
    visibleCount: number;
    hasState: boolean;
    hasQty: boolean;
    onApplyState: (value: number) => void;
    onApplyQty: (value: number) => void;
  };
  let { visibleCount, hasState, hasQty, onApplyState, onApplyQty }: Props = $props();

  let bulkState = $state<number | ''>('');
  let bulkQty = $state<number | ''>('');

  function clickState(): void {
    if (bulkState === '') return;
    const ok = window.confirm(
      $_('player.inventory.bulk_confirm', { values: { count: visibleCount } }),
    );
    if (!ok) return;
    onApplyState(bulkState >>> 0);
    track('bulk_edit', { field: 'state', count: visibleCount });
  }

  function clickQty(): void {
    if (bulkQty === '') return;
    const ok = window.confirm(
      $_('player.inventory.bulk_confirm', { values: { count: visibleCount } }),
    );
    if (!ok) return;
    onApplyQty(Math.max(0, Math.trunc(Number(bulkQty))));
    track('bulk_edit', { field: 'qty', count: visibleCount });
  }
</script>

<details class="group rounded-xl border border-danger-edge bg-danger-bg/70 px-4 py-3">
  <summary
    class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-danger marker:hidden"
  >
    <span class="flex items-center gap-2">
      <span aria-hidden="true">⚠️</span>
      {$_('player.inventory.bulk_summary')}
    </span>
    <span class="text-xs font-normal text-danger transition-transform group-open:rotate-180">▼</span
    >
  </summary>

  <div class="mt-3 space-y-3">
    <p class="rounded-md bg-danger-bg px-3 py-2 text-xs font-semibold text-danger">
      {$_('player.inventory.bulk_warning', { values: { count: visibleCount } })}
    </p>

    <div class="flex flex-wrap items-end gap-3">
      {#if hasState}
        <div class="flex items-end gap-2">
          <label class="block">
            <span class="block text-xs font-bold text-content">
              {$_('player.inventory.bulk_state')}
            </span>
            <select
              class="{INPUT_CLASS} mt-1"
              value={bulkState}
              onchange={(e) => {
                const raw = e.currentTarget.value;
                bulkState = raw === '' ? '' : Number.parseInt(raw, 10);
              }}
            >
              <option value="">{$_('player.inventory.bulk_state_pick')}</option>
              {#each STATE_OPTIONS as opt (opt.hash)}
                <option value={opt.hash}>{$_(`player.inventory.state.${opt.name}`)}</option>
              {/each}
            </select>
          </label>
          <button
            type="button"
            class={PILL_BUTTON_CLASS}
            disabled={bulkState === '' || visibleCount === 0}
            onclick={clickState}
          >
            {$_('player.inventory.apply')}
          </button>
        </div>
      {/if}

      {#if hasQty}
        <div class="flex items-end gap-2">
          <label class="block">
            <span class="block text-xs font-bold text-content">
              {$_('player.inventory.bulk_qty')}
            </span>
            <input
              type="number"
              min="0"
              step="1"
              class="{INPUT_CLASS} mt-1 w-24"
              bind:value={bulkQty}
            />
          </label>
          <button
            type="button"
            class={PILL_BUTTON_CLASS}
            disabled={bulkQty === '' || visibleCount === 0}
            onclick={clickQty}
          >
            {$_('player.inventory.apply')}
          </button>
        </div>
      {/if}
    </div>
  </div>
</details>

<style>
  /* Hide the default summary marker on Safari/Chrome alike. */
  summary::-webkit-details-marker {
    display: none;
  }
</style>
