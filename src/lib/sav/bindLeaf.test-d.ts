import { miiAccessor } from '$lib/mii/miiEditor.svelte';
import { playerAccessor } from '$lib/player/playerEditor.svelte';
import { bindLeaf } from './bindLeaf.svelte';
import { mii, player } from './schema';

bindLeaf(playerAccessor, player.Player.Money);
bindLeaf(miiAccessor, mii.Mii.Name.Name);

// @ts-expect-error player leaf into mii accessor
bindLeaf(miiAccessor, player.Player.Money);

// @ts-expect-error mii leaf into player accessor
bindLeaf(playerAccessor, mii.Mii.Name.Name);
