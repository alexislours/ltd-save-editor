<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { confirmRestore, dismissRestore, restoreModal } from './sessionRestore.svelte';
  import { PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from './styles';

  let dialog: HTMLDialogElement | undefined = $state();
  let suppressNextClose = false;

  $effect(() => {
    if (!dialog) return;
    if (restoreModal.open && !dialog.open) dialog.showModal();
    else if (!restoreModal.open && dialog.open) {
      suppressNextClose = true;
      dialog.close();
    }
  });

  function onConfirm(): void {
    suppressNextClose = true;
    confirmRestore();
  }

  function onDismiss(): void {
    dismissRestore();
  }

  function onCloseEvent(): void {
    if (suppressNextClose) {
      suppressNextClose = false;
      return;
    }
    dismissRestore();
  }

  function onBackdrop(event: MouseEvent): void {
    if (event.target === dialog) onDismiss();
  }

  function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatSavedAt(ts: number, code: string): string {
    try {
      return new Intl.DateTimeFormat(code || undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString();
    }
  }
</script>

<dialog
  bind:this={dialog}
  onclose={onCloseEvent}
  onclick={onBackdrop}
  class="m-auto w-[min(32rem,calc(100vw_-_2rem))] rounded-2xl bg-surface p-0 text-content-strong shadow-xl ring-1 ring-edge/60 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
>
  <div class="border-b border-edge/40 bg-surface-muted/80 px-6 py-4">
    <h2 class="text-lg font-bold text-content-strong">{$_('session.restore_title')}</h2>
  </div>

  <div class="px-6 py-5">
    <p class="text-sm text-content">{$_('session.restore_intro')}</p>
    <ul class="mt-3 space-y-1.5 text-sm">
      {#each restoreModal.sessions as s (s.kind)}
        <li class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <span class="font-bold text-content-strong">
            {$_(`tab.${s.kind}`)}
            <span class="font-mono font-normal text-content/80">— {s.name}</span>
          </span>
          <span class="font-mono text-xs text-content/70">
            {formatBytes(s.bytes.byteLength)} · {formatSavedAt(s.savedAt, $locale ?? '')}
          </span>
        </li>
      {/each}
      {#if restoreModal.sidecar}
        <li class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <span class="font-bold text-content-strong">
            ShareMii <span class="font-mono font-normal text-content/80">— Ugc/ files</span>
          </span>
          <span class="font-mono text-xs text-content/70">
            {restoreModal.sidecar.count} file{restoreModal.sidecar.count === 1 ? '' : 's'} · {formatBytes(
              restoreModal.sidecar.totalBytes,
            )}
          </span>
        </li>
      {/if}
    </ul>
    <p class="mt-4 text-xs text-content/80">{$_('session.restore_note')}</p>
  </div>

  <div class="flex justify-end gap-2 border-t border-edge/40 bg-surface-muted/40 px-6 py-3">
    <button type="button" class={PILL_BUTTON_CLASS} onclick={onDismiss}>
      {$_('session.restore_dismiss')}
    </button>
    <button type="button" class={PRIMARY_BUTTON_CLASS} onclick={onConfirm}>
      {$_('session.restore_confirm')}
    </button>
  </div>
</dialog>
