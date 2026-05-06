<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { filesFromDataTransfer } from '$lib/bulk/bulkLoad';
  import DropZone from '$lib/ui/DropZone.svelte';
  import UploadArrowIcon from '$lib/ui/UploadArrowIcon.svelte';
  import { loadFolderToSidecar, loadZipToSidecar } from './sidecarLoaders';

  type Props = {
    busy: boolean;
  };

  let { busy = $bindable() }: Props = $props();

  let zipInput = $state<HTMLInputElement | null>(null);

  async function pickFolder(files: File[]): Promise<void> {
    if (files.length === 0) return;
    busy = true;
    try {
      await loadFolderToSidecar(files);
    } finally {
      busy = false;
    }
  }

  async function pickZip(file: File): Promise<void> {
    busy = true;
    try {
      await loadZipToSidecar(file);
    } finally {
      busy = false;
    }
  }

  async function onDataTransfer(dt: DataTransfer): Promise<void> {
    const direct = Array.from(dt.files);
    if (direct.length === 1 && direct[0].name.toLowerCase().endsWith('.zip')) {
      await pickZip(direct[0]);
      return;
    }
    const files = await filesFromDataTransfer(dt);
    await pickFolder(files);
  }

  async function onZipPicked(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    await pickZip(file);
  }
</script>

<DropZone multiple webkitdirectory onFiles={pickFolder} {onDataTransfer}>
  {#snippet children({ openPicker })}
    <UploadArrowIcon />
    <p class="text-base font-bold text-content-strong">
      {$_('ugc_editor.dropzone.title')}
    </p>
    <p class="text-sm text-content-muted">{$_('ugc_editor.dropzone.hint')}</p>

    <div class="mt-2 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        class="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-content-strong shadow-sm ring-1 ring-edge/60 transition-colors hover:bg-surface-sunken"
        onclick={(e) => {
          e.stopPropagation();
          openPicker();
        }}
        disabled={busy}
      >
        {$_('ugc_editor.sidecar.pick_folder')}
      </button>
      <button
        type="button"
        class="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-content-strong shadow-sm ring-1 ring-edge/60 transition-colors hover:bg-surface-sunken"
        onclick={(e) => {
          e.stopPropagation();
          zipInput?.click();
        }}
        disabled={busy}
      >
        {$_('ugc_editor.sidecar.pick_zip')}
      </button>
    </div>
  {/snippet}
</DropZone>

<input bind:this={zipInput} type="file" class="hidden" accept=".zip" onchange={onZipPicked} />
