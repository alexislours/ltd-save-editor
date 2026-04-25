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
  class="m-auto w-full max-w-lg rounded-2xl bg-white p-0 text-slate-900 shadow-xl ring-1 ring-amber-400/60 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
>
  <div
    class="flex items-center justify-between gap-4 border-b border-amber-400/40 bg-amber-50/80 px-6 py-4"
  >
    <h2 class="text-lg font-bold text-slate-900">Changelog</h2>
    <button
      type="button"
      onclick={handleClose}
      aria-label="Close changelog"
      class="rounded-full px-2 py-1 text-sm font-bold text-slate-600 transition-colors hover:bg-amber-200/60 hover:text-slate-900"
    >
      ✕
    </button>
  </div>

  <div class="max-h-[60vh] overflow-y-auto px-6 py-5">
    <ol class="space-y-6">
      {#each CHANGELOG as entry (entry.version)}
        <li>
          <div class="flex items-baseline gap-3">
            <span class="font-mono text-base font-bold text-orange-700">v{entry.version}</span>
            <span class="text-xs text-slate-500">{entry.date}</span>
          </div>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {#each entry.changes as change (change)}
              <li>{change}</li>
            {/each}
          </ul>
        </li>
      {/each}
    </ol>
  </div>
</dialog>
