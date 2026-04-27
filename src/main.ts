import { mount } from 'svelte';
import './app.css';
import './lib/i18n';
import App from './App.svelte';
import { identify } from './lib/analytics';
import { loadClothList } from './lib/sav/clothList.svelte';
import { loadFoodList } from './lib/sav/foodList.svelte';
import { loadHashList } from './lib/sav/hashList.svelte';
import { loadRoomStyleList } from './lib/sav/roomStyleList.svelte';
import { loadTreasureList } from './lib/sav/treasureList.svelte';

identify({ app_version: __APP_VERSION__ });

loadHashList();
loadFoodList();
loadClothList();
loadTreasureList();
loadRoomStyleList();

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
