import { createSaveEditor } from '../sav/createSaveEditor.svelte';
import { MAP_SCHEMA } from '../sav/schema';

const editor = createSaveEditor<'map'>('map', MAP_SCHEMA);

export const mapSave = editor.state;
export const syncFromSave = editor.syncFromSave;
export const commitEntryEdit = editor.commitEntryEdit;
export const downloadMapSav = editor.downloadModified;
export const mapAccessor = editor.accessor;
