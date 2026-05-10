<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { overwriteModal } from '$lib/bulk/bulkOverwriteState.svelte';
  import { clearAllModal } from '$lib/bulk/clearAllState.svelte';
  import ConfirmListModal from '$lib/ui/ConfirmListModal.svelte';

  const loadBulkLoader = (): Promise<typeof import('$lib/bulk/bulkLoader.svelte')> =>
    import('$lib/bulk/bulkLoader.svelte');
  const loadClearAll = (): Promise<typeof import('$lib/bulk/clearAll.svelte')> =>
    import('$lib/bulk/clearAll.svelte');

  const confirmOverwrite = async (): Promise<void> => (await loadBulkLoader()).confirmOverwrite();
  const cancelOverwrite = async (): Promise<void> => (await loadBulkLoader()).cancelOverwrite();
  const confirmClearAll = async (): Promise<void> => (await loadClearAll()).confirmClearAll();
  const cancelClearAll = async (): Promise<void> => (await loadClearAll()).cancelClearAll();
</script>

<ConfirmListModal
  bind:open={overwriteModal.open}
  items={overwriteModal.conflicts}
  title={$_('bulk.overwrite_title')}
  intro={$_('bulk.overwrite_intro')}
  warning={$_('bulk.overwrite_warning')}
  confirmLabel={$_('bulk.overwrite_confirm')}
  onConfirm={confirmOverwrite}
  onCancel={cancelOverwrite}
/>
<ConfirmListModal
  bind:open={clearAllModal.open}
  items={clearAllModal.items}
  title={$_('bulk.clear_title')}
  intro={$_('bulk.clear_intro')}
  warning={$_('bulk.clear_warning')}
  confirmLabel={$_('bulk.clear_confirm')}
  onConfirm={confirmClearAll}
  onCancel={cancelClearAll}
/>
