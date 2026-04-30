<script module lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  type CacheEntry = { bytes: Uint8Array; url: string };
  const THUMB_CACHE_MAX = 128;
  const thumbUrlCache = new SvelteMap<string, CacheEntry>();

  function rememberThumb(name: string, entry: CacheEntry): void {
    thumbUrlCache.set(name, entry);
    while (thumbUrlCache.size > THUMB_CACHE_MAX) {
      const oldestKey = thumbUrlCache.keys().next().value;
      if (oldestKey === undefined) break;
      const oldest = thumbUrlCache.get(oldestKey);
      if (oldest) URL.revokeObjectURL(oldest.url);
      thumbUrlCache.delete(oldestKey);
    }
  }

  async function getThumbUrl(name: string, bytes: Uint8Array): Promise<string | null> {
    const existing = thumbUrlCache.get(name);
    if (existing && existing.bytes === bytes) return existing.url;
    if (existing) {
      URL.revokeObjectURL(existing.url);
      thumbUrlCache.delete(name);
    }
    try {
      const codec = await import('./codec');
      const decoded = await codec.decodeZsFile(name, bytes);
      const blob = await codec.rgbaToPngBlob(decoded);
      const url = URL.createObjectURL(blob);
      rememberThumb(name, { bytes, url });
      return url;
    } catch {
      return null;
    }
  }
</script>

<script lang="ts">
  import { ugcThumbFileName } from '../shareMii/ugcKinds';
  import type { UgcKind } from '../shareMii';
  import type { SidecarSource } from '../shareMii/sidecar';

  type Props = {
    slot: number;
    name: string;
    kind: UgcKind;
    sidecar: SidecarSource;
    selected: boolean;
    edited: boolean;
    onSelect: (slot: number) => void;
  };

  let { slot, name, kind, sidecar, selected, edited, onSelect }: Props = $props();

  let el = $state<HTMLLIElement | null>(null);
  let visible = $state(false);
  let thumbUrl = $state<string | null>(null);

  const thumbName = $derived(ugcThumbFileName(kind, slot - 1));
  const thumbBytes = $derived(sidecar.files.get(thumbName) ?? null);

  $effect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible = true;
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  $effect(() => {
    const bytes = thumbBytes;
    const name = thumbName;
    if (!visible || !bytes) {
      thumbUrl = null;
      return;
    }
    let cancelled = false;
    void getThumbUrl(name, bytes).then((url) => {
      if (!cancelled) thumbUrl = url;
    });
    return () => {
      cancelled = true;
    };
  });
</script>

<li bind:this={el}>
  <button
    type="button"
    onclick={() => onSelect(slot)}
    class={[
      'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
      selected ? 'bg-orange-500/15 text-content-strong' : 'hover:bg-surface-muted text-content',
    ]}
  >
    <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface ring-1 ring-edge/40">
      {#if thumbUrl}
        <img src={thumbUrl} alt="" class="h-full w-full object-contain" loading="lazy" />
      {/if}
      {#if edited}
        <span
          class="absolute right-0.5 top-0.5 inline-flex h-2 w-2 rounded-full bg-orange-500 ring-1 ring-surface"
          aria-hidden="true"
        ></span>
      {/if}
    </div>
    <div class="min-w-0 flex-1">
      <span class="block font-mono text-[11px] text-content-muted"
        >#{String(slot - 1).padStart(3, '0')}</span
      >
      <span class="block truncate">{name}</span>
    </div>
  </button>
</li>
