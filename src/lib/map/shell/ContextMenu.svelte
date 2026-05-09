<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    open: boolean;
    x: number;
    y: number;
    onClose: () => void;
    items: Snippet;
  };

  let { open, x, y, onClose, items }: Props = $props();

  let menuEl: HTMLDivElement | undefined = $state();

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  function onDocPointerDown(e: PointerEvent): void {
    const t = e.target as Node | null;
    if (!t) return;
    if (menuEl?.contains(t)) return;
    onClose();
  }

  const adjusted = $derived.by(() => {
    if (typeof window === 'undefined') return { x, y };
    const w = 220;
    const h = 240;
    const maxX = Math.max(0, window.innerWidth - w - 8);
    const maxY = Math.max(0, window.innerHeight - h - 8);
    return { x: Math.min(x, maxX), y: Math.min(y, maxY) };
  });

  $effect(() => {
    if (!open) return;
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDocPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDocPointerDown, true);
    };
  });
</script>

{#if open}
  <div
    bind:this={menuEl}
    role="menu"
    class="fixed z-50 min-w-[200px] rounded-2xl bg-surface/95 backdrop-blur-md ring-1 ring-edge/60 shadow-xl p-2"
    style="left: {adjusted.x}px; top: {adjusted.y}px;"
  >
    {@render items()}
  </div>
{/if}
