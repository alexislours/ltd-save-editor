<script lang="ts">
  import type { Snippet } from 'svelte';
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

<div class="grid gap-6">
  <header>
    <h2 class="text-2xl font-bold tracking-tight text-slate-900">
      {title}
    </h2>
    <p class="mt-1 text-sm text-slate-700">{description}</p>
  </header>

  {#if save}
    <div
      class="flex items-center justify-between gap-4 rounded-full bg-amber-300/90 px-5 py-2.5 shadow-sm ring-1 ring-amber-400/60"
    >
      <div class="min-w-0">
        <p class="truncate font-mono text-sm font-bold text-slate-900">
          {save.name}
        </p>
        <p class="mt-0.5 text-xs text-slate-700">
          {save.size.toLocaleString()} bytes · {new Date(save.lastModified).toLocaleString()}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-900 shadow ring-1 ring-amber-400/60 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 active:scale-95"
        onclick={() => clearSave(kind)}
      >
        Replace
      </button>
    </div>

    {#if error}
      <Card>
        <p class="text-sm text-red-600">
          Failed to parse {fileName}: {error}
        </p>
      </Card>
    {:else if !ready}
      <Card>
        <p class="text-sm text-slate-600">Waiting for {fileName}…</p>
      </Card>
    {:else}
      {@render children()}
    {/if}
  {:else}
    <Card>
      <p class="mb-4 text-sm text-neutral-600">
        Upload your <span
          class="rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-900"
          >{fileName}</span
        >
        to begin.
      </p>
      <FileDropZone {kind} />
    </Card>
  {/if}
</div>
