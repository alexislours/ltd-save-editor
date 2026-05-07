<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    accept?: string;
    multiple?: boolean;
    webkitdirectory?: boolean;
    paddingClass?: string;
    onFiles?: (files: File[]) => void;
    onDataTransfer?: (dt: DataTransfer) => void;
    children: Snippet<[{ openPicker: () => void }]>;
  };

  let {
    accept,
    multiple = false,
    webkitdirectory = false,
    paddingClass = 'p-10',
    onFiles,
    onDataTransfer,
    children,
  }: Props = $props();

  let dragging = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  const baseClass =
    'flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-surface text-center transition-colors';
  const draggingClass = 'border-orange-500 bg-surface-sunken';
  const idleClass = 'border-edge/70 hover:border-orange-500';

  function openPicker(): void {
    fileInput?.click();
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    dragging = true;
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    dragging = false;
    if (!event.dataTransfer) return;
    if (onDataTransfer) {
      onDataTransfer(event.dataTransfer);
      return;
    }
    onFiles?.(Array.from(event.dataTransfer.files));
  }

  function onPick(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    target.value = '';
    onFiles?.(files);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  }
</script>

<div
  role="button"
  tabindex="0"
  class={[baseClass, paddingClass, dragging ? draggingClass : idleClass]}
  ondragover={onDragOver}
  ondragleave={() => (dragging = false)}
  ondrop={onDrop}
  onclick={openPicker}
  onkeydown={onKeyDown}
>
  {@render children({ openPicker })}
</div>

<input
  bind:this={fileInput}
  type="file"
  class="hidden"
  {multiple}
  {accept}
  {webkitdirectory}
  onchange={onPick}
/>
