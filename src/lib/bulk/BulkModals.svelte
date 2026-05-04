<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { cancelOverwrite, confirmOverwrite, overwriteModal } from '$lib/bulk/bulkLoader.svelte';
  import { cancelClearAll, clearAllModal, confirmClearAll } from '$lib/bulk/clearAll.svelte';
  import ConfirmListModal from '$lib/ui/ConfirmListModal.svelte';
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
