import { mount } from 'svelte';
import './app.css';
import './lib/i18n';
import App from './App.svelte';
import { loadFoodList } from './lib/sav/foodList.svelte';
import { loadHashList } from './lib/sav/hashList.svelte';

loadHashList();
loadFoodList();

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
