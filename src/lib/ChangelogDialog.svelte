<script lang="ts">
  import { CHANGELOG } from './changelog';

  type Props = { open: boolean; onClose: () => void };
  let { open = $bindable(), onClose }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  function handleClose(): void {
    open = false;
    onClose();
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === dialog) handleClose();
  }
</script>

<dialog
  bind:this={dialog}
  onclose={handleClose}
  onclick={handleBackdropClick}
  class="m-auto w-[min(32rem,calc(100vw_-_2rem))] rounded-2xl bg-surface p-0 text-content-strong shadow-xl ring-1 ring-edge/60 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
>
  <div
    class="flex items-center justify-between gap-4 border-b border-edge/40 bg-surface-muted/80 px-6 py-4"
  >
    <h2 class="text-lg font-bold text-content-strong">Changelog</h2>
    <button
      type="button"
      onclick={handleClose}
      aria-label="Close changelog"
      class="rounded-full px-2 py-1 text-sm font-bold text-content-muted transition-colors hover:bg-surface-sunken/60 hover:text-content-strong"
    >
      ✕
    </button>
  </div>

  <div class="max-h-[60vh] overflow-y-auto px-6 py-5">
    <ol class="space-y-6">
      {#each CHANGELOG as entry (entry.version)}
        <li>
          <div class="flex items-baseline gap-3">
            <span class="font-mono text-base font-bold text-brand">v{entry.version}</span>
            <span class="text-xs text-content-faint">{entry.date}</span>
          </div>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content">
            {#each entry.changes as change (change)}
              <li>{change}</li>
            {/each}
          </ul>
        </li>
      {/each}
    </ol>
  </div>
</dialog>
