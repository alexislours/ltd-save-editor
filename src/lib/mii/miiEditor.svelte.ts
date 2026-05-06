import type { Accessor } from '$lib/sav/materialized/accessor';
import { createSaveEditor } from '$lib/sav/createSaveEditor.svelte';
import { MII_SCHEMA } from '$lib/sav/schema';

const editor = createSaveEditor<'mii'>('mii', MII_SCHEMA);

export const miiState = editor.state;
export const syncFromSave = editor.syncFromSave;
export const commitEntryEdit = editor.commitEntryEdit;
export const downloadModified = editor.downloadModified;
export const miiAccessor = editor.accessor;

export type MiiAccessor = Accessor<'mii'>;
