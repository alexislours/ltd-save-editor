<script lang="ts">
  import type { Component } from 'svelte';
  import { getPath, matchRoute } from './navigation.svelte';

  type RouteLoader = () => Promise<{ default: Component }>;

  type Props = {
    routes: Record<string, RouteLoader>;
    fallback: RouteLoader;
  };
  let { routes, fallback }: Props = $props();

  const match = $derived(matchRoute(getPath(), routes));
  const Resolved = $derived((match?.component ?? fallback) as RouteLoader);
</script>

{#key Resolved}
  {#await Resolved() then mod}
    <mod.default />
  {:catch err}
    <p class="p-6 text-sm text-red-600">
      Failed to load page: {err instanceof Error ? err.message : String(err)}
    </p>
  {/await}
{/key}
