<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    clearSidecar,
    sidecarFileCount,
    sidecarOrigin,
  } from '$lib/shareMii/sidecar/sidecarStore.svelte';
  import { CARD_BASE_CLASS, PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import { loadFolderToSidecar, loadZipToSidecar } from './sidecarLoaders';

  type Props = {
    busy: boolean;
  };

  let { busy = $bindable() }: Props = $props();

  let folderInput = $state<HTMLInputElement | null>(null);
  let zipInput = $state<HTMLInputElement | null>(null);

  const sidecarLabel = $derived.by(() => {
    const o = sidecarOrigin();
    if (o === 'none') return $_('ugc_editor.sidecar.none');
    return $_('ugc_editor.sidecar.loaded', { values: { count: sidecarFileCount() } });
  });

  async function pickFolder(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    target.value = '';
    busy = true;
    try {
      await loadFolderToSidecar(files);
    } finally {
      busy = false;
    }
  }

  async function pickZip(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    busy = true;
    try {
      await loadZipToSidecar(file);
    } finally {
      busy = false;
    }
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
    <span class="text-xs text-content-muted">{$_('ugc_editor.sidecar.hint')}</span>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      class={PILL_BUTTON_CLASS}
      onclick={() => folderInput?.click()}
      disabled={busy}>{$_('ugc_editor.sidecar.pick_folder')}</button
    >
    <button
      type="button"
      class={PILL_BUTTON_CLASS}
      onclick={() => zipInput?.click()}
      disabled={busy}>{$_('ugc_editor.sidecar.pick_zip')}</button
    >
    {#if sidecarOrigin() !== 'none'}
      <button type="button" class={PILL_BUTTON_CLASS} onclick={() => clearSidecar()} disabled={busy}
        >{$_('ugc_editor.sidecar.clear')}</button
      >
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
