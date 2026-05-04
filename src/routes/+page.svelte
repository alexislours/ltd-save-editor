<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { PUBLIC_SITE_URL } from '$env/static/public';

  onMount(() => {
    void goto(resolve('/player'), { replaceState: true });
  });
</script>

<svelte:head>
  <title>Tomodachi Life: Living the Dream - Save Editor</title>
  <link rel="canonical" href="{PUBLIC_SITE_URL}/" />
  <meta property="og:title" content="Tomodachi Life: Living the Dream - Save Editor" />
  <meta property="og:description" content="Save editor for Tomodachi Life: Living the Dream." />
  <meta property="og:url" content="{PUBLIC_SITE_URL}/" />
  <meta name="twitter:title" content="Tomodachi Life: Living the Dream - Save Editor" />
  <meta name="twitter:description" content="Save editor for Tomodachi Life: Living the Dream." />
</svelte:head>
