<script lang="ts">
  import { page } from '$app/state';
  import { PUBLIC_SITE_URL } from '$env/static/public';

  const DEFAULT_TITLE = 'Tomodachi Life: Living the Dream - Save Editor';
  const DEFAULT_DESCRIPTION = 'Save editor for Tomodachi Life: Living the Dream.';

  type Props = { title?: string; description?: string };
  let { title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION }: Props = $props();

  const url = $derived(`${PUBLIC_SITE_URL}${page.url.pathname}`);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
</svelte:head>
