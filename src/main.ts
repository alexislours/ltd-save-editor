import { mount } from 'svelte';
import './app.css';
import './lib/i18n';
import App from './App.svelte';
import { loadClothList } from './lib/sav/clothList.svelte';
import { loadCoordinateList } from './lib/sav/coordinateList.svelte';
import { loadFoodList } from './lib/sav/foodList.svelte';
import { loadHabitList } from './lib/sav/habitList.svelte';
import { loadHashList } from './lib/sav/hashList.svelte';
import { loadItemList } from './lib/sav/itemList.svelte';
import { loadRoomStyleList } from './lib/sav/roomStyleList.svelte';
import { loadTreasureList } from './lib/sav/treasureList.svelte';
import { loadTroubleList } from './lib/sav/troubleList.svelte';
import { loadWordKindLabels } from './lib/sav/wordKindLabels.svelte';

loadHashList();
loadFoodList();
loadClothList();
loadCoordinateList();
loadTreasureList();
loadRoomStyleList();
loadItemList();
loadTroubleList();
loadHabitList();
loadWordKindLabels();

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
