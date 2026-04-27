<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { openLightbox } from '../lightboxState.svelte';
  import {
    type RoomStyleGroup,
    type RoomStyleVariant,
    roomStyleVariantImageUrl,
  } from '../sav/roomStyleList.svelte';
  import { INPUT_CLASS } from '../styles';
  import { STATE_OPTIONS } from './stateOptions';

  type Props = {
    group: RoomStyleGroup;
    label: string;
    primaryState: number;
    primaryQty: number;
    readState: (variantIndex: number) => number;
    readQty: (variantIndex: number) => number;
    writeStateAll: (value: number) => void;
    writeQtyAll: (value: number) => void;
    writeStateOne: (variantIndex: number, value: number) => void;
    writeQtyOne: (variantIndex: number, value: number) => void;
  };
  let {
    group,
    label,
    primaryState,
    primaryQty,
    readState,
    readQty,
    writeStateAll,
    writeQtyAll,
    writeStateOne,
    writeQtyOne,
  }: Props = $props();

  let expanded = $state(false);
  const matched = $derived(STATE_OPTIONS.some((o) => o.hash === primaryState >>> 0));
  const variants = $derived(group.variants);

  function variantLabel(v: RoomStyleVariant): string {
    return `${label} #${v.variantIndex + 1}`;
  }
</script>

<li class="interior-row">
  <div class="flex items-center gap-3 px-3 py-2">
    <button
      type="button"
      aria-label={expanded
        ? $_('player.inventory.collapse_variants')
        : $_('player.inventory.expand_variants')}
      aria-expanded={expanded}
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm font-bold text-content-muted hover:bg-surface-sunken/40 disabled:opacity-30"
      disabled={variants.length <= 1}
      onclick={() => (expanded = !expanded)}
    >
      <span class:rotate-90={expanded} class="transition-transform">▶</span>
    </button>

    <button
      type="button"
      onclick={() => openLightbox(roomStyleVariantImageUrl(variants[0]), label)}
      aria-label={$_('lightbox.open', { values: { label } })}
      class="flex h-14 w-14 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-md border border-edge/40 bg-surface transition-colors hover:border-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <img
        src={roomStyleVariantImageUrl(variants[0])}
        alt={label}
        loading="lazy"
        decoding="async"
        class="h-full w-full object-contain p-1"
      />
    </button>

    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-bold text-content-strong">{label}</div>
      <div class="truncate font-mono text-[11px] text-content-faint">
        {group.groupKey} ·
        {$_('player.interiors.variant_count', { values: { count: variants.length } })}
      </div>
    </div>

    <select
      class="{INPUT_CLASS} w-32 text-xs"
      value={primaryState >>> 0}
      onchange={(e) => writeStateAll(Number.parseInt(e.currentTarget.value, 10))}
    >
      {#each STATE_OPTIONS as opt (opt.hash)}
        <option value={opt.hash}>{$_(`player.inventory.state.${opt.name}`)}</option>
      {/each}
      {#if !matched}
        <option value={primaryState >>> 0}>
          0x{(primaryState >>> 0).toString(16).padStart(8, '0')}
        </option>
      {/if}
    </select>

    <div class="flex items-center gap-1">
      <button
        type="button"
        aria-label={$_('player.inventory.decrement')}
        class="qty-btn h-7 w-7 rounded-full border border-edge/60 bg-surface text-content hover:bg-surface-muted disabled:opacity-40"
        disabled={primaryQty <= 0}
        onclick={() => writeQtyAll(primaryQty - 1)}
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
        value={primaryQty}
        onchange={(e) => {
          const v = Number(e.currentTarget.value);
          if (Number.isFinite(v)) writeQtyAll(v);
        }}
      />
      <button
        type="button"
        aria-label={$_('player.inventory.increment')}
        class="qty-btn h-7 w-7 rounded-full border border-edge/60 bg-surface text-content hover:bg-surface-muted"
        onclick={() => writeQtyAll(primaryQty + 1)}
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
  </div>

  {#if expanded && variants.length > 1}
    <ul class="border-t border-edge/40 bg-surface-sunken/30 px-3 py-2">
      {#each variants as variant (variant.name)}
        {@const vi = variant.variantIndex}
        {@const variantState = readState(vi)}
        {@const variantQty = readQty(vi)}
        {@const variantMatched = STATE_OPTIONS.some((o) => o.hash === variantState >>> 0)}
        {@const vLabel = variantLabel(variant)}
        <li class="flex items-center gap-3 py-1.5 pl-9">
          <button
            type="button"
            onclick={() => openLightbox(roomStyleVariantImageUrl(variant), vLabel)}
            aria-label={$_('lightbox.open', { values: { label: vLabel } })}
            class="flex h-10 w-10 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-md border border-edge/40 bg-surface transition-colors hover:border-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <img
              src={roomStyleVariantImageUrl(variant)}
              alt={vLabel}
              loading="lazy"
              decoding="async"
              class="h-full w-full object-contain p-1"
            />
          </button>
          <div class="min-w-0 flex-1">
            <div class="text-xs font-semibold text-content">
              {$_('player.interiors.variant_label', { values: { index: vi + 1 } })}
            </div>
            <div class="truncate font-mono text-[10px] text-content-faint">
              {variant.name}
            </div>
          </div>

          <select
            class="{INPUT_CLASS} w-32 text-xs"
            value={variantState >>> 0}
            onchange={(e) => writeStateOne(vi, Number.parseInt(e.currentTarget.value, 10))}
          >
            {#each STATE_OPTIONS as opt (opt.hash)}
              <option value={opt.hash}>{$_(`player.inventory.state.${opt.name}`)}</option>
            {/each}
            {#if !variantMatched}
              <option value={variantState >>> 0}>
                0x{(variantState >>> 0).toString(16).padStart(8, '0')}
              </option>
            {/if}
          </select>

          <div class="flex items-center gap-1">
            <button
              type="button"
              aria-label={$_('player.inventory.decrement')}
              class="qty-btn h-6 w-6 rounded-full border border-edge/60 bg-surface text-content hover:bg-surface-muted disabled:opacity-40"
              disabled={variantQty <= 0}
              onclick={() => writeQtyOne(vi, variantQty - 1)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" class="h-2.5 w-2.5">
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
              class="{INPUT_CLASS} w-14 text-center font-mono"
              value={variantQty}
              onchange={(e) => {
                const v = Number(e.currentTarget.value);
                if (Number.isFinite(v)) writeQtyOne(vi, v);
              }}
            />
            <button
              type="button"
              aria-label={$_('player.inventory.increment')}
              class="qty-btn h-6 w-6 rounded-full border border-edge/60 bg-surface text-content hover:bg-surface-muted"
              onclick={() => writeQtyOne(vi, variantQty + 1)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" class="h-2.5 w-2.5">
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
        </li>
      {/each}
    </ul>
  {/if}
</li>

<style>
  .interior-row {
    content-visibility: auto;
    contain-intrinsic-size: 72px auto;
  }

  .qty-btn {
    display: grid;
    place-items: center;
  }
</style>
