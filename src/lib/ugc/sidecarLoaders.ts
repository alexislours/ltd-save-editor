import { format } from 'svelte-i18n';
import { get } from 'svelte/store';
import { errorMessage } from '$lib/errorMessage';
import { sidecarFromFolderFiles, sidecarFromZipFile } from '$lib/shareMii';
import { mergeSidecarFiles } from '$lib/shareMii/sidecar/sidecarStore.svelte';
import { showToast } from '$lib/toast/toast.svelte';

function t(key: string, values?: Record<string, string | number | boolean>): string {
  return get(format)(key, { values });
}

export async function loadFolderToSidecar(files: File[]): Promise<void> {
  if (files.length === 0) return;
  try {
    const src = await sidecarFromFolderFiles(files);
    if (src.files.size === 0) {
      showToast('warn', t('ugc_editor.toast.no_zs_in_folder'));
      return;
    }
    mergeSidecarFiles('folder', src.files);
    showToast('success', t('ugc_editor.toast.loaded_folder', { count: src.files.size }));
  } catch (e) {
    showToast('error', errorMessage(e));
  }
}

export async function loadZipToSidecar(file: File): Promise<void> {
  try {
    const src = await sidecarFromZipFile(file);
    if (src.files.size === 0) {
      showToast('warn', t('ugc_editor.toast.no_zs_in_zip'));
      return;
    }
    mergeSidecarFiles('zip', src.files);
    showToast('success', t('ugc_editor.toast.loaded_zip', { count: src.files.size }));
  } catch (e) {
    showToast('error', errorMessage(e));
  }
}
