<script lang="ts">
  import type { Component } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { getPath, matchRoute } from './navigation.svelte';

  type RouteLoader = () => Promise<{ default: Component }>;

  type Props = {
    routes: Record<string, RouteLoader>;
    fallback: RouteLoader;
  };
  let { routes, fallback }: Props = $props();

  const cache = new SvelteMap<RouteLoader, Component>();
  let Current = $state<Component | null>(null);
  let error = $state<unknown>(null);

  const match = $derived(matchRoute(getPath(), routes));
  const Resolved = $derived((match?.component ?? fallback) as RouteLoader);

  $effect(() => {
    const loader = Resolved;
    const cached = cache.get(loader);
    if (cached) {
      Current = cached;
      error = null;
      return;
    }
    let cancelled = false;
    loader().then(
      (mod) => {
        if (cancelled) return;
        cache.set(loader, mod.default);
        Current = mod.default;
        error = null;
      },
      (err) => {
        if (!cancelled) error = err;
      },
    );
    return () => {
      cancelled = true;
    };
  });
</script>

{#if error}
  <p class="p-6 text-sm text-danger">
    Failed to load page: {error instanceof Error ? error.message : String(error)}
  </p>
{:else if Current}
  <Current />
{/if}
