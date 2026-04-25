import { createSaveEditor } from './sav/createSaveEditor.svelte';

const editor = createSaveEditor('player');

export const playerState = editor.state;
export const syncFromSave = editor.syncFromSave;
export const markDirty = editor.markDirty;
export const downloadModified = editor.downloadModified;
