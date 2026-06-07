import type { Accessor } from '@alexislours/ltd-savedata';
import { createSaveEditor } from '$lib/sav/createSaveEditor.svelte';
import { PLAYER_SCHEMA } from '@alexislours/ltd-savedata/schema';

const editor = createSaveEditor<'player'>('player', PLAYER_SCHEMA);

export const playerState = editor.state;
export const syncFromSave = editor.syncFromSave;
export const commitEntryEdit = editor.commitEntryEdit;
export const downloadModified = editor.downloadModified;
export const playerAccessor = editor.accessor;

export type PlayerAccessor = Accessor<'player'>;
