<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '$lib/ui/styles';

  type Props = {
    open: boolean;
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  };
  let {
    open = $bindable(),
    title,
    body,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
  }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let outcome: 'pending' | 'confirmed' | 'cancelled' = 'pending';

  const cancelText = $derived(cancelLabel ?? $_('bulk.cancel'));

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      outcome = 'pending';
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
  });

  function close(): void {
    open = false;
  }

  function confirm(): void {
    if (outcome !== 'pending') return;
    outcome = 'confirmed';
    close();
    onConfirm();
  }

  function cancel(): void {
    if (outcome !== 'pending') return;
    outcome = 'cancelled';
    close();
    onCancel?.();
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
    <p class="text-sm text-content">{body}</p>
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
