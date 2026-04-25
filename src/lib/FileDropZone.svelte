<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { track } from './analytics';
  import {
    detectSaveKindFromBytes,
    detectSaveKindFromName,
    expectedFileName,
    setSaveFromFile,
    type SaveKind,
  } from './saveFile.svelte';

  type Props = { kind: SaveKind };
  let { kind }: Props = $props();

  let dragging = $state(false);
  let error = $state<string | null>(null);
  let fileInput: HTMLInputElement;

  const baseClass =
    'group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-white p-12 text-center transition-colors';
  const draggingClass = 'border-orange-500 bg-amber-100';
  const idleClass = 'border-amber-400/70 hover:border-orange-500';

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return;
    error = null;
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      error = $_('save.read_failed');
      track('save_load_failed', { kind, reason: 'read_failed' });
      return;
    }
    const detected = detectSaveKindFromBytes(bytes) ?? detectSaveKindFromName(file.name);
    if (detected === null) {
      error = $_('save.unrecognized_file', { values: { actual: file.name } });
      track('save_load_failed', { kind, reason: 'unrecognized' });
      return;
    }
    if (detected !== kind) {
      error = $_('save.wrong_tab', {
        values: {
          actual: file.name,
          expectedTab: $_(`tab.${kind}`),
          correctTab: $_(`tab.${detected}`),
        },
      });
      track('save_load_failed', { kind, reason: 'wrong_tab' });
      return;
    }
    try {
      await setSaveFromFile(kind, file);
      track('save_loaded', { kind, size: file.size });
    } catch (e) {
      error = e instanceof Error ? e.message : $_('save.read_failed');
      track('save_load_failed', { kind, reason: 'set_failed' });
    }
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    dragging = false;
    void handleFile(event.dataTransfer?.files?.[0]);
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    dragging = true;
  }

  function onPick(event: Event): void {
    const target = event.target as HTMLInputElement;
    void handleFile(target.files?.[0]);
  }
</script>

<div class="w-full">
  <div
    role="button"
    tabindex="0"
    class="{baseClass} {dragging ? draggingClass : idleClass}"
    ondragover={onDragOver}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
    onclick={() => fileInput.click()}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.click()}
  >
    <svg
      class="h-10 w-10 text-orange-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
    <p class="text-base font-bold text-slate-900">
      {$_('save.drop_here', { values: { fileName: expectedFileName[kind] } })}
    </p>
    <p class="text-sm text-slate-600">{$_('save.drop_browse')}</p>

    <input bind:this={fileInput} type="file" class="hidden" onchange={onPick} />
  </div>

  <p class="mt-3 text-center text-xs text-amber-700">
    <span class="font-semibold">{$_('save.drop_warning_label')}</span>
    {$_('save.drop_warning_text')}
  </p>

  {#if error}
    <div
      role="alert"
      class="mt-3 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm"
    >
      <svg
        class="mt-0.5 h-5 w-5 shrink-0 text-red-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.342 3.94l-8.4 14.55A1.5 1.5 0 003.243 21h17.514a1.5 1.5 0 001.301-2.51l-8.4-14.55a1.5 1.5 0 00-2.598 0z"
        />
      </svg>
      <p class="font-semibold">{error}</p>
    </div>
  {/if}
</div>
