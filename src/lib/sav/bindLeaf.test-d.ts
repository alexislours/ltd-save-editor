import { miiAccessor } from '../mii/miiEditor.svelte';
import { playerAccessor } from '../playerEditor.svelte';
import { bindLeaf } from './bindLeaf.svelte';
import { MII_SCHEMA, PLAYER_SCHEMA } from './schema';

bindLeaf(playerAccessor, PLAYER_SCHEMA.Player.Money);
bindLeaf(miiAccessor, MII_SCHEMA.Mii.Name.Name);

// @ts-expect-error player leaf into mii accessor
bindLeaf(miiAccessor, PLAYER_SCHEMA.Player.Money);

// @ts-expect-error mii leaf into player accessor
bindLeaf(playerAccessor, MII_SCHEMA.Mii.Name.Name);
