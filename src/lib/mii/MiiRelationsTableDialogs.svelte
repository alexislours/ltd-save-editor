<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { ChipPopup } from './relationsTableHelpers';

  type Props = {
    confirmAcquaint: boolean;
    strangerCount: number;
    popup: ChipPopup | null;
    onConfirmAcquaintApply: () => void;
    onConfirmAcquaintClose: () => void;
    onChipPopupClose: () => void;
  };

  let {
    confirmAcquaint,
    strangerCount,
    popup,
    onConfirmAcquaintApply,
    onConfirmAcquaintClose,
    onChipPopupClose,
  }: Props = $props();
</script>

{#if confirmAcquaint}
  <div
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
    role="presentation"
    onclick={onConfirmAcquaintClose}
  >
    <div
      class="relative w-full max-w-sm rounded-xl bg-surface p-4 shadow-xl ring-1 ring-edge/60"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="acquaint-confirm-title"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <h4 id="acquaint-confirm-title" class="pr-8 text-sm font-bold text-content-strong">
        {$_('mii.relations.acquaint_confirm_title')}
      </h4>
      <p class="mt-2 text-sm text-content">
        {$_('mii.relations.acquaint_confirm_body', { values: { count: strangerCount } })}
      </p>
      <button
        type="button"
        class="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-sunken hover:text-content-strong"
        aria-label={$_('mii.relations.change_blocked_dismiss')}
        onclick={onConfirmAcquaintClose}
      >
        ×
      </button>
      <div class="mt-3 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md bg-surface-sunken px-3 py-1.5 text-xs font-bold text-content-strong ring-1 ring-edge/60 hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
          onclick={onConfirmAcquaintClose}
        >
          {$_('mii.relations.acquaint_cancel')}
        </button>
        <button
          type="button"
          class="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
          onclick={onConfirmAcquaintApply}
        >
          {$_('mii.relations.acquaint_apply')}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if popup}
  <div
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
    role="presentation"
    onclick={onChipPopupClose}
  >
    <div
      class="relative w-full max-w-sm rounded-xl bg-surface p-4 shadow-xl ring-1 ring-edge/60"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="chip-popup-title"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <h4 id="chip-popup-title" class="pr-8 text-sm font-bold text-content-strong">
        {popup.title}
      </h4>
      <p class="mt-2 text-sm text-content">{popup.body}</p>
      {#if popup.note}
        <p
          class="mt-2 rounded-md bg-surface-sunken px-2.5 py-1.5 text-xs text-content-muted ring-1 ring-edge/40"
        >
          {popup.note}
        </p>
      {/if}
      <button
        type="button"
        class="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-sunken hover:text-content-strong"
        aria-label={$_('mii.relations.change_blocked_dismiss')}
        onclick={onChipPopupClose}
      >
        ×
      </button>
      <div class="mt-3 flex justify-end">
        <button
          type="button"
          class="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
          onclick={onChipPopupClose}
        >
          {$_('mii.relations.popup_ok')}
        </button>
      </div>
    </div>
  </div>
{/if}
