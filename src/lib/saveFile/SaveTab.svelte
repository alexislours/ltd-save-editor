<script lang="ts">
  import type { Snippet } from 'svelte';
  import { _ } from 'virtual:i18n/_shared';
  import Card from '$lib/ui/Card.svelte';
  import FileDropZone from '$lib/saveFile/FileDropZone.svelte';
  import SaveBar from '$lib/saveFile/SaveBar.svelte';
  import { clearSave, getSave } from '$lib/saveFile/saveFile.svelte';
  import { expectedFileName, type SaveKind } from '$lib/saveFile/types';

  type Props = {
    kind: SaveKind;
    title: string;
    description: string;
    /** Parse error message; when set, replaces children with an error Card. */
    error?: string | null;
    /** Whether the parsed save is ready to display; falsy shows a "waiting" Card. */
    ready?: boolean;
    /** Whether the save has unsaved edits; drives the status chip in the command bar. */
    dirty?: boolean;
    /** Primary action label (e.g. download); only shown once the save is ready. */
    actionLabel?: string;
    onAction?: () => void;
    children: Snippet;
  };
  let {
    kind,
    title,
    description,
    error = null,
    ready = true,
    dirty = false,
    actionLabel,
    onAction,
    children,
  }: Props = $props();

  const save = $derived(getSave(kind));
  const fileName = $derived(expectedFileName[kind]);
  const fileMeta = $derived(
    save
      ? `${save.size.toLocaleString()} ${$_('save.bytes_unit')} · ${new Date(save.lastModified).toLocaleString()}`
      : '',
  );
  const showAction = $derived(ready && !error);
</script>

<div class="grid grid-cols-1 gap-6">
  <header class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h2 class="text-2xl font-bold tracking-tight text-content-strong">
        {title}
      </h2>
      <p class="mt-1 text-sm text-content">{description}</p>
    </div>
  </header>

  {#if save}
    <SaveBar
      {dirty}
      actionLabel={showAction ? actionLabel : undefined}
      onAction={showAction ? onAction : undefined}
      fileName={save.name}
      {fileMeta}
      onReplace={() => clearSave(kind)}
      replaceLabel={$_('save.replace_action')}
    />

    {#if error}
      <Card>
        <p class="text-sm text-danger">
          {$_('save.parse_failed', { values: { fileName, error } })}
        </p>
      </Card>
    {:else if !ready}
      <Card>
        <p class="text-sm text-content-muted">{$_('save.waiting', { values: { fileName } })}</p>
      </Card>
    {:else}
      {@render children()}
    {/if}
  {:else}
    <Card>
      <p class="mb-4 text-sm text-content-muted">
        {$_('save.upload_prompt', { values: { fileName } })}
      </p>
      <FileDropZone {kind} />
    </Card>
  {/if}
</div>
