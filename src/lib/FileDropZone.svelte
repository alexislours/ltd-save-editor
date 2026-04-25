<script lang="ts">
  import { expectedFileName, setSaveFromFile, type SaveKind } from './saveFile.svelte';

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
    try {
      await setSaveFromFile(kind, file);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to read file';
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
      Drop <span class="font-mono">{expectedFileName[kind]}</span> here
    </p>
    <p class="text-sm text-slate-600">or click to browse</p>

    <input bind:this={fileInput} type="file" class="hidden" onchange={onPick} />
  </div>

  <p class="mt-3 text-center text-xs text-amber-700">
    <span class="font-semibold">Warning:</span> editing save files can corrupt your game. Always keep
    a backup of the original file before uploading.
  </p>

  {#if error}
    <p class="mt-3 text-center text-sm text-red-600">{error}</p>
  {/if}
</div>
