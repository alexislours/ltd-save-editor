<script lang="ts">
  import Router from './lib/Router.svelte';

  const routes = {
    '/': () => import('./routes/Index.svelte'),
    '/player': () => import('./routes/Player.svelte'),
    '/mii': () => import('./routes/Mii.svelte'),
    '/map': () => import('./routes/Map.svelte'),
    '/about': () => import('./routes/About.svelte'),
  };

  const fallback = () => import('./routes/Index.svelte');
</script>

<main class="flex min-h-svh flex-col bg-amber-50 text-neutral-900">
  <Router {routes} {fallback} />
</main>
