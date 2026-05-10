import { loadMiiLabels } from '$lib/mii/miiLabelList.svelte';
import { loadClothList } from './clothList.svelte';
import { loadCoordinateList } from './coordinateList.svelte';
import { loadFoodList } from './foodList.svelte';
import { loadHabitList } from './habitList.svelte';
import { loadItemList } from './itemList.svelte';
import { loadRoomStyleList } from './roomStyleList.svelte';
import { loadTreasureList } from './treasureList.svelte';
import { loadTroubleList } from './troubleList.svelte';
import { loadWishList } from './wishList.svelte';
import { loadWordKindLabels } from './wordKindLabels.svelte';

export function loadListsForMii(): void {
  loadClothList();
  loadCoordinateList();
  loadFoodList();
  loadHabitList();
  loadMiiLabels();
  loadTreasureList();
  loadTroubleList();
  loadWordKindLabels();
}

export function loadListsForPlayer(): void {
  loadClothList();
  loadCoordinateList();
  loadFoodList();
  loadItemList();
  loadRoomStyleList();
  loadTreasureList();
  loadWishList();
}
