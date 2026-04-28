<script lang="ts">
  import type { Snippet } from 'svelte';
  import { _ } from 'svelte-i18n';
  import Card from './Card.svelte';
  import FileDropZone from './FileDropZone.svelte';
  import { clearSave, expectedFileName, getSave, type SaveKind } from './saveFile.svelte';

  type Props = {
    kind: SaveKind;
    title: string;
    description: string;
    /** Parse error message; when set, replaces children with an error Card. */
    error?: string | null;
    /** Whether the parsed save is ready to display; falsy shows a "waiting" Card. */
    ready?: boolean;
    children: Snippet;
  };
  let { kind, title, description, error = null, ready = true, children }: Props = $props();

  const save = $derived(getSave(kind));
  const fileName = $derived(expectedFileName[kind]);
</script>

<div class="grid grid-cols-1 gap-6">
  <header>
    <h2 class="text-2xl font-bold tracking-tight text-content-strong">
      {title}
    </h2>
    <p class="mt-1 text-sm text-content">{description}</p>
  </header>

  {#if save}
    <div
      class="flex items-center justify-between gap-3 rounded-2xl bg-header/90 px-4 py-2.5 shadow-sm ring-1 ring-edge/60 sm:gap-4 sm:rounded-full sm:px-5"
    >
      <div class="min-w-0 flex-1">
        <p class="truncate font-mono text-sm font-bold text-content-strong">
          {save.name}
        </p>
        <p class="mt-0.5 truncate text-xs text-content">
          {save.size.toLocaleString()}
          {$_('save.bytes_unit')} · {new Date(save.lastModified).toLocaleString()}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-full bg-surface px-4 py-1.5 text-xs font-bold text-content-strong shadow ring-1 ring-edge/60 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 active:scale-95"
        onclick={() => clearSave(kind)}
      >
        {$_('save.replace_action')}
      </button>
    </div>

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
