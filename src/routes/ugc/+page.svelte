<script lang="ts">
  import { PUBLIC_SITE_URL } from '$env/static/public';
  import UgcEditorPage from '$lib/ugcEditor/UgcEditorPage.svelte';
</script>

<svelte:head>
  <title>UGC editor - LTD Save Editor</title>
  <link rel="canonical" href="{PUBLIC_SITE_URL}/ugc" />
  <meta property="og:title" content="UGC editor - LTD Save Editor" />
  <meta property="og:description" content="Save editor for Tomodachi Life: Living the Dream." />
  <meta property="og:url" content="{PUBLIC_SITE_URL}/ugc" />
  <meta name="twitter:title" content="UGC editor - LTD Save Editor" />
  <meta name="twitter:description" content="Save editor for Tomodachi Life: Living the Dream." />
</svelte:head>

<UgcEditorPage />
