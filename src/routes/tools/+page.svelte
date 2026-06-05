<script lang="ts">
  import { _ } from 'virtual:i18n/tools';
  import RouteMeta from '$lib/layout/RouteMeta.svelte';
  import DiffTool from '$lib/tools/diff/DiffTool.svelte';
</script>

<RouteMeta title="Tools - LTD Save Editor" />

<div class="grid grid-cols-1 gap-6">
  <header class="min-w-0">
    <h2 class="text-2xl font-bold tracking-tight text-content-strong">{$_('tools.title')}</h2>
    <p class="mt-1 text-sm text-content">{$_('tools.description')}</p>
  </header>

  <DiffTool />
</div>
