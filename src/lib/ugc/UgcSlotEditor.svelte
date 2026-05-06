<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '$lib/ui/styles';
  import PreviewPair from '$lib/ugc/texture/PreviewPair.svelte';
  import TextureControls from '$lib/ugc/texture/TextureControls.svelte';
  import type { TextureReplaceState } from '$lib/ugc/texture/textureReplaceState.svelte';

  type Props = {
    busy: boolean;
    editedName: string;
    currentName: string;
    currentPreview: string | null;
    tx: TextureReplaceState;
    selectedHasThumb: boolean;
    selectedIsEdited: boolean;
    hasLanRestriction: boolean;
    regenerateThumb: boolean;
    sidecarMissing: boolean;
    onApplyRename: () => void;
    onPickPng: () => void;
    onLoadFile: (file: File) => void;
    onApplyReplace: () => void;
    onExportPng: () => void;
    onRevertSelected: () => void;
    onClearLanRestriction: () => void;
  };

  let {
    busy,
    editedName = $bindable(),
    currentName,
    currentPreview,
    tx,
    selectedHasThumb,
    selectedIsEdited,
    hasLanRestriction,
    regenerateThumb = $bindable(),
    sidecarMissing,
    onApplyRename,
    onPickPng,
    onLoadFile,
    onApplyReplace,
    onExportPng,
    onRevertSelected,
    onClearLanRestriction,
  }: Props = $props();
</script>

<div class="mb-4">
  <label
    for="ugc-rename-input"
    class="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-content-muted"
  >
    {$_('ugc_editor.editor.rename.label')}
  </label>
  <div class="flex items-center gap-2">
    <input
      id="ugc-rename-input"
      type="text"
      bind:value={editedName}
      maxlength={63}
      placeholder={$_('ugc_editor.editor.rename.placeholder')}
      class="min-w-0 flex-1 rounded-lg border border-edge/60 bg-surface px-3 py-1.5 text-sm text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
    />
    <button
      type="button"
      class={PILL_BUTTON_CLASS}
      onclick={onApplyRename}
      disabled={busy || editedName.trim().length === 0 || editedName.trim() === currentName}
    >
      {$_('ugc_editor.editor.rename.save')}
    </button>
  </div>
</div>

<PreviewPair
  {currentPreview}
  newPreview={tx.newPreview}
  newPreviewElapsedMs={tx.previewElapsedMs}
  {sidecarMissing}
  dropTutorialId="ugc-drop"
  onPick={onPickPng}
  onDropFile={onLoadFile}
/>

{#if tx.pendingDecoded}
  <TextureControls state={tx} {busy} />
{/if}

{#if hasLanRestriction}
  <div class="mt-4 flex items-start gap-3 rounded-lg border border-edge/60 bg-surface/50 p-3">
    <div class="min-w-0 flex-1">
      <span class="block text-xs font-bold text-content-strong">
        {$_('ugc_editor.editor.lan_restriction.label')}
      </span>
      <span class="mt-0.5 block text-xs text-content-muted">
        {$_('ugc_editor.editor.lan_restriction.hint')}
      </span>
    </div>
    <button type="button" class={PILL_BUTTON_CLASS} onclick={onClearLanRestriction} disabled={busy}>
      {$_('ugc_editor.editor.lan_restriction.clear')}
    </button>
  </div>
{/if}

{#if selectedHasThumb}
  <label class="mt-4 flex items-start gap-2 text-xs text-content">
    <input
      type="checkbox"
      bind:checked={regenerateThumb}
      class="mt-0.5 h-4 w-4 rounded border-edge/60 text-orange-500 focus:ring-orange-500/30"
    />
    <span>
      <span class="block font-bold text-content-strong">
        {$_('ugc_editor.editor.regenerate_thumb')}
      </span>
      <span class="block text-content-muted">
        {$_('ugc_editor.editor.regenerate_thumb_hint')}
      </span>
    </span>
  </label>
{/if}

<div class="mt-4 flex flex-wrap items-center justify-end gap-2">
  {#if selectedIsEdited}
    <button type="button" class={PILL_BUTTON_CLASS} onclick={onRevertSelected} disabled={busy}>
      {$_('ugc_editor.editor.revert')}
    </button>
  {/if}
  <button
    type="button"
    class={PILL_BUTTON_CLASS}
    onclick={onExportPng}
    disabled={busy || sidecarMissing}
  >
    {$_('ugc_editor.editor.export_png')}
  </button>
  <button
    type="button"
    data-tutorial="ugc-replace"
    class={PRIMARY_BUTTON_CLASS}
    onclick={onApplyReplace}
    disabled={busy || !tx.pendingDecoded}
  >
    {busy ? $_('ugc_editor.editor.applying') : $_('ugc_editor.editor.replace')}
  </button>
</div>
