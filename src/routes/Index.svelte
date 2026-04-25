<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from '../lib/navigation.svelte';

  onMount(() => navigate('/player', { replace: true }));
</script>
