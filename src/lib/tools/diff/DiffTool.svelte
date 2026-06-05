<script lang="ts">
  import { _ } from 'virtual:i18n/tools';
  import { untrack } from 'svelte';
  import { track } from '$lib/analytics';
  import { errorMessage } from '$lib/errorMessage';
  import type { DecodedSave } from '$lib/sav/materialized/types';
  import {
    decodeSaveBytes,
    detectSaveKindFromBytes,
    getSave,
    schemaForKind,
  } from '$lib/saveFile/saveFile.svelte';
  import { expectedFileName, SAVE_KINDS, type SaveKind } from '$lib/saveFile/types';
  import { SvelteSet } from 'svelte/reactivity';
  import DropZone from '$lib/ui/DropZone.svelte';
  import SubTabs from '$lib/ui/SubTabs.svelte';
  import { TAB_PILL_CLASS } from '$lib/ui/styles';
  import { diffDecoded } from './diffEngine';
  import DiffView from './DiffView.svelte';

  type Mode = 'edits' | 'files';
  let mode = $state<Mode>('edits');

  const MODE_TABS = $derived([
    { value: 'edits' as const, label: $_('tools.diff.mode_edits') },
    { value: 'files' as const, label: $_('tools.diff.mode_files') },
  ]);

  const loadedKinds = $derived(SAVE_KINDS.filter((k) => getSave(k)?.decoded != null));
  let selectedKind = $state<SaveKind | null>(null);
  $effect(() => {
    if (selectedKind && loadedKinds.includes(selectedKind)) return;
    selectedKind = loadedKinds[0] ?? null;
  });

  const editsSave = $derived(selectedKind ? getSave(selectedKind) : null);

  const baseline = $derived.by(() => {
    const save = editsSave;
    if (!save?.loadedBytes || !selectedKind) return null;
    return decodeSaveBytes(selectedKind, save.loadedBytes).decoded;
  });

  const editsDiff = $derived.by(() => {
    if (!selectedKind || !baseline || !editsSave?.decoded) return null;
    return diffDecoded(schemaForKind(selectedKind), baseline, editsSave.decoded);
  });

  type FileSlot = { name: string; kind?: SaveKind; decoded?: DecodedSave; error?: string };
  let slotA = $state<FileSlot | null>(null);
  let slotB = $state<FileSlot | null>(null);

  async function readSlot(files: File[]): Promise<FileSlot | null> {
    const file = files[0];
    if (!file) return null;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const kind = detectSaveKindFromBytes(bytes);
      if (!kind) {
        return {
          name: file.name,
          error: $_('tools.diff.files_unrecognized', { values: { fileName: file.name } }),
        };
      }
      const { decoded, error } = decodeSaveBytes(kind, bytes);
      if (!decoded) {
        return {
          name: file.name,
          error: $_('tools.diff.files_parse_failed', {
            values: { fileName: file.name, error: error ?? '' },
          }),
        };
      }
      return { name: file.name, kind, decoded };
    } catch (e) {
      return { name: file.name, error: errorMessage(e) };
    }
  }

  let compareKey = $state(0);
  async function onDropA(files: File[]): Promise<void> {
    slotA = await readSlot(files);
    compareKey++;
  }
  async function onDropB(files: File[]): Promise<void> {
    slotB = await readSlot(files);
    compareKey++;
  }

  const filesDiff = $derived.by(() => {
    if (!slotA?.decoded || !slotB?.decoded || !slotA.kind || !slotB.kind) return null;
    if (slotA.kind !== slotB.kind) return null;
    return diffDecoded(schemaForKind(slotA.kind), slotA.decoded, slotB.decoded);
  });

  const kindMismatch = $derived(
    slotA?.kind != null && slotB?.kind != null && slotA.kind !== slotB.kind,
  );

  const trackedKeys = new SvelteSet<string>();
  $effect(() => {
    const key =
      mode === 'edits'
        ? editsDiff && editsDiff.total > 0 && selectedKind
          ? `edits:${selectedKind}`
          : null
        : filesDiff && filesDiff.total > 0 && slotA && slotB
          ? `files:${compareKey}`
          : null;
    if (!key) return;
    untrack(() => {
      if (trackedKeys.has(key)) return;
      trackedKeys.add(key);
      track('diff_compared', { mode });
    });
  });
</script>

<div class="flex flex-col gap-5">
  <SubTabs tabs={MODE_TABS} bind:value={mode} label={$_('tools.diff.mode_label')} />

  {#if mode === 'edits'}
    {#if loadedKinds.length === 0}
      <p
        class="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-content-muted ring-1 ring-edge/40"
      >
        {$_('tools.diff.edits_no_saves')}
      </p>
    {:else}
      {#if loadedKinds.length > 1}
        <nav class="flex flex-wrap gap-1.5" aria-label={$_('tools.diff.edits_pick_label')}>
          {#each loadedKinds as kind (kind)}
            {@const active = selectedKind === kind}
            <button
              type="button"
              class={[
                TAB_PILL_CLASS,
                active
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-surface-sunken/70 text-content hover:text-content-strong',
              ]}
              onclick={() => (selectedKind = kind)}
              aria-current={active ? 'page' : undefined}
            >
              {expectedFileName[kind]}
            </button>
          {/each}
        </nav>
      {/if}

      {#if editsSave && !editsSave.loadedBytes}
        <p class="rounded-2xl bg-danger-bg px-4 py-4 text-sm text-danger ring-1 ring-danger-edge">
          {$_('tools.diff.edits_no_original')}
        </p>
      {:else if editsDiff && selectedKind}
        <p class="text-sm text-content">
          {$_('tools.diff.edits_summary', {
            values: { fileName: editsSave?.name ?? expectedFileName[selectedKind] },
          })}
        </p>
        {#key selectedKind}
          <DiffView
            result={editsDiff}
            beforeLabel={`${editsSave?.name ?? ''} (original)`}
            afterLabel={`${editsSave?.name ?? ''} (edited)`}
          />
        {/key}
      {/if}
    {/if}
  {:else}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each [{ slot: slotA, label: $_('tools.diff.files_before_label'), onFiles: onDropA, clear: () => (slotA = null) }, { slot: slotB, label: $_('tools.diff.files_after_label'), onFiles: onDropB, clear: () => (slotB = null) }] as col (col.label)}
        <div class="flex flex-col gap-2">
          <span class="text-xs font-bold uppercase tracking-wide text-content-muted"
            >{col.label}</span
          >
          {#if col.slot}
            <div
              class="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-edge/40"
            >
              <div class="min-w-0">
                <p class="truncate font-mono text-xs font-bold text-content-strong">
                  {col.slot.name}
                </p>
                {#if col.slot.error}
                  <p class="mt-0.5 text-xs text-danger">{col.slot.error}</p>
                {:else if col.slot.kind}
                  <p class="mt-0.5 text-[11px] uppercase tracking-wide text-content-faint">
                    {expectedFileName[col.slot.kind]}
                  </p>
                {/if}
              </div>
              <button
                type="button"
                class="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-content-strong ring-1 ring-edge/60 transition-colors hover:bg-surface-sunken"
                onclick={col.clear}
              >
                {$_('tools.diff.files_replace')}
              </button>
            </div>
          {:else}
            <DropZone accept=".sav" paddingClass="p-6" onFiles={col.onFiles}>
              <p class="text-xs text-content-muted">{$_('tools.diff.files_drop')}</p>
            </DropZone>
          {/if}
        </div>
      {/each}
    </div>

    {#if kindMismatch && slotA?.kind && slotB?.kind}
      <p class="rounded-2xl bg-danger-bg px-4 py-4 text-sm text-danger ring-1 ring-danger-edge">
        {$_('tools.diff.files_kind_mismatch', { values: { a: slotA.kind, b: slotB.kind } })}
      </p>
    {:else if filesDiff}
      {#key compareKey}
        <DiffView
          result={filesDiff}
          beforeLabel={slotA?.name ?? 'A'}
          afterLabel={slotB?.name ?? 'B'}
        />
      {/key}
    {/if}
  {/if}
</div>
