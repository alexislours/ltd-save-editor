<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { track } from '$lib/analytics';
  import { errorMessage } from '$lib/errorMessage';
  import { CARD_BASE_CLASS, PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import { sidecarFromFolderFiles, sidecarFromZipFile } from './sidecar/sidecar';
  import {
    clearSidecar,
    mergeSidecarFiles,
    sidecarFileCount,
    sidecarOrigin,
  } from './sidecar/sidecarStore.svelte';

  type Props = {
    working: boolean;
    onMessage: (kind: 'info' | 'warn' | 'error', text: string) => void;
  };

  let { working, onMessage }: Props = $props();

  let folderInput = $state<HTMLInputElement | null>(null);
  let zipInput = $state<HTMLInputElement | null>(null);

  const sidecarLabel = $derived.by(() => {
    const o = sidecarOrigin();
    if (o === 'none') return $_('sharemii.sidecar.none_loaded');
    const source = o === 'bulk' ? 'auto' : o;
    return $_('sharemii.sidecar.loaded_summary', {
      values: { count: sidecarFileCount(), source },
    });
  });

  async function pickFolder(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    target.value = '';
    if (files.length === 0) return;
    try {
      const src = await sidecarFromFolderFiles(files);
      mergeSidecarFiles('folder', src.files);
      track('sharemii_inbound', { source: 'folder', count: src.files.size });
      onMessage(
        'info',
        $_('sharemii.sidecar.loaded_from_folder', { values: { count: src.files.size } }),
      );
    } catch (e) {
      onMessage('error', errorMessage(e));
    }
  }

  async function pickZip(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    try {
      const src = await sidecarFromZipFile(file);
      mergeSidecarFiles('zip', src.files);
      track('sharemii_inbound', { source: 'zip', count: src.files.size });
      onMessage(
        'info',
        $_('sharemii.sidecar.loaded_from_zip', { values: { count: src.files.size } }),
      );
    } catch (e) {
      onMessage('error', errorMessage(e));
    }
  }

  function onClear(): void {
    clearSidecar();
    track('sharemii_sidecar_cleared', {});
  }
</script>

<section class={[CARD_BASE_CLASS, 'flex flex-col gap-3 px-4 py-3 sm:px-5']}>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
    <span
      class={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
        sidecarOrigin() === 'none'
          ? 'bg-surface-sunken text-warn'
          : 'bg-surface-sunken text-content-strong',
      ]}
    >
      <span
        aria-hidden="true"
        class={['h-2 w-2 rounded-full', sidecarOrigin() === 'none' ? 'bg-warn' : 'bg-orange-500']}
      ></span>
      {sidecarLabel}
    </span>
    <span class="text-xs text-content-muted">
      {$_('sharemii.sidecar.hint')}
    </span>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      class={PILL_BUTTON_CLASS}
      onclick={() => folderInput?.click()}
      disabled={working}>{$_('sharemii.sidecar.pick_folder')}</button
    >
    <button
      type="button"
      class={PILL_BUTTON_CLASS}
      onclick={() => zipInput?.click()}
      disabled={working}>{$_('sharemii.sidecar.pick_zip')}</button
    >
    {#if sidecarOrigin() !== 'none'}
      <button type="button" class={PILL_BUTTON_CLASS} onclick={onClear}>
        {$_('sharemii.sidecar.clear')}
      </button>
    {/if}
  </div>
</section>

<input
  bind:this={folderInput}
  type="file"
  class="hidden"
  multiple
  webkitdirectory
  onchange={pickFolder}
/>
<input bind:this={zipInput} type="file" class="hidden" accept=".zip" onchange={pickZip} />
