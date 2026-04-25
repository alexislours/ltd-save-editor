import { mount } from 'svelte';
import './app.css';
import './lib/i18n';
import App from './App.svelte';
import { loadClothList } from './lib/sav/clothList.svelte';
import { loadFoodList } from './lib/sav/foodList.svelte';
import { loadHashList } from './lib/sav/hashList.svelte';

loadHashList();
loadFoodList();
loadClothList();

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
