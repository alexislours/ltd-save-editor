import type { Accessor } from '$lib/sav/materialized/accessor';
import { createSaveEditor } from '$lib/sav/createSaveEditor.svelte';
import { PLAYER_SCHEMA } from '$lib/sav/schema';

const editor = createSaveEditor<'player'>('player', PLAYER_SCHEMA);

export const playerState = editor.state;
export const syncFromSave = editor.syncFromSave;
export const commitEntryEdit = editor.commitEntryEdit;
export const downloadModified = editor.downloadModified;
export const playerAccessor = editor.accessor;

export type PlayerAccessor = Accessor<'player'>;
