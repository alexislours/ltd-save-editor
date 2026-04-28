<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { SaveKind } from './saveFile.svelte';
  import { PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from './styles';

  type Props = {
    open: boolean;
    items: SaveKind[];
    title: string;
    intro: string;
    warning?: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  let {
    open = $bindable(),
    items,
    title,
    intro,
    warning,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
  }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  const cancelText = $derived(cancelLabel ?? $_('bulk.cancel'));

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  function close(): void {
    open = false;
  }

  function confirm(): void {
    close();
    onConfirm();
  }

  function cancel(): void {
    close();
    onCancel();
  }

  function onBackdrop(event: MouseEvent): void {
    if (event.target === dialog) cancel();
  }
</script>

<dialog
  bind:this={dialog}
  onclose={cancel}
  onclick={onBackdrop}
  class="m-auto w-[min(28rem,calc(100vw_-_2rem))] rounded-2xl bg-surface p-0 text-content-strong shadow-xl ring-1 ring-edge/60 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
>
  <div class="border-b border-edge/40 bg-surface-muted/80 px-6 py-4">
    <h2 class="text-lg font-bold text-content-strong">{title}</h2>
  </div>

  <div class="px-6 py-5">
    <p class="text-sm text-content">{intro}</p>
    <ul class="mt-3 list-disc space-y-1 pl-5 text-sm font-bold text-content-strong">
      {#each items as kind (kind)}
        <li>{$_(`tab.${kind}`)}</li>
      {/each}
    </ul>
    {#if warning}
      <p class="mt-4 text-xs text-warn">
        <span class="font-semibold">{$_('save.drop_warning_label')}</span>
        {warning}
      </p>
    {/if}
  </div>

  <div class="flex justify-end gap-2 border-t border-edge/40 bg-surface-muted/40 px-6 py-3">
    <button type="button" class={PILL_BUTTON_CLASS} onclick={cancel}>
      {cancelText}
    </button>
    <button type="button" class={PRIMARY_BUTTON_CLASS} onclick={confirm}>
      {confirmLabel}
    </button>
  </div>
</dialog>
