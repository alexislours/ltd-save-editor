import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { loadHashList } from './lib/sav/hashList.svelte';

loadHashList();

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
