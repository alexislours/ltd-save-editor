<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { openLightbox } from '../lightboxState.svelte';
  import { INPUT_CLASS } from '../styles';
  import { STATE_OPTIONS } from './stateOptions';

  type Props = {
    imageUrl: string | null;
    label: string;
    internalName: string;
    hasState: boolean;
    hasQty: boolean;
    state: number;
    qty: number;
    onStateChange: (v: number) => void;
    onQtyChange: (v: number) => void;
  };
  let {
    imageUrl,
    label,
    internalName,
    hasState,
    hasQty,
    state,
    qty,
    onStateChange,
    onQtyChange,
  }: Props = $props();

  const matched = $derived(STATE_OPTIONS.some((o) => o.hash === state >>> 0));
</script>

<li class="inventory-row flex items-center gap-3 px-3 py-2">
  {#if imageUrl}
    <button
      type="button"
      onclick={() => openLightbox(imageUrl, label)}
      aria-label={$_('lightbox.open', { values: { label } })}
      class="flex h-14 w-14 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-md border border-edge/40 bg-surface transition-colors hover:border-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <img
        src={imageUrl}
        alt={label}
        loading="lazy"
        decoding="async"
        class="h-full w-full object-contain p-1"
      />
    </button>
  {:else}
    <div
      class="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface"
    >
      <span class="text-[10px] text-content-faint">·</span>
    </div>
  {/if}

  <div class="min-w-0 flex-1">
    <div class="truncate text-sm font-bold text-content-strong">{label}</div>
    <div class="truncate font-mono text-[11px] text-content-faint">{internalName}</div>
  </div>

  {#if hasState}
    <select
      class="{INPUT_CLASS} w-32 text-xs"
      value={state >>> 0}
      onchange={(e) => onStateChange(Number.parseInt(e.currentTarget.value, 10))}
    >
      {#each STATE_OPTIONS as opt (opt.hash)}
        <option value={opt.hash}>{$_(`player.inventory.state.${opt.name}`)}</option>
      {/each}
      {#if !matched}
        <option value={state >>> 0}>0x{(state >>> 0).toString(16).padStart(8, '0')}</option>
      {/if}
    </select>
  {/if}

  {#if hasQty}
    <div class="flex items-center gap-1">
      <button
        type="button"
        aria-label={$_('player.inventory.decrement')}
        class="qty-btn h-7 w-7 rounded-full border border-edge/60 bg-surface text-content hover:bg-surface-muted disabled:opacity-40"
        disabled={qty <= 0}
        onclick={() => onQtyChange(qty - 1)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" class="h-3 w-3">
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
        class="{INPUT_CLASS} w-16 text-center font-mono"
        value={qty}
        onchange={(e) => {
          const v = Number(e.currentTarget.value);
          if (Number.isFinite(v)) onQtyChange(v);
        }}
      />
      <button
        type="button"
        aria-label={$_('player.inventory.increment')}
        class="qty-btn h-7 w-7 rounded-full border border-edge/60 bg-surface text-content hover:bg-surface-muted"
        onclick={() => onQtyChange(qty + 1)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" class="h-3 w-3">
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
  {/if}
</li>

<style>
  .inventory-row {
    content-visibility: auto;
    contain-intrinsic-size: 72px auto;
  }

  .qty-btn {
    display: grid;
    place-items: center;
  }
</style>
