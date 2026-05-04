<script lang="ts">
  import { PUBLIC_SITE_URL } from '$env/static/public';
  import ShareMiiPage from '$lib/shareMii/ShareMiiPage.svelte';
</script>

<svelte:head>
  <title>Share Mii - LTD Save Editor</title>
  <link rel="canonical" href="{PUBLIC_SITE_URL}/sharemii" />
  <meta property="og:title" content="Share Mii - LTD Save Editor" />
  <meta property="og:description" content="Save editor for Tomodachi Life: Living the Dream." />
  <meta property="og:url" content="{PUBLIC_SITE_URL}/sharemii" />
  <meta name="twitter:title" content="Share Mii - LTD Save Editor" />
  <meta name="twitter:description" content="Save editor for Tomodachi Life: Living the Dream." />
</svelte:head>

<ShareMiiPage />
