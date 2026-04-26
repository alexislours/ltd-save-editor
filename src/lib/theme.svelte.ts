export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ltd-save-editor:theme';

function readStored(): Theme {
  if (typeof localStorage === 'undefined') return 'light';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'dark' ? 'dark' : 'light';
}

function applyToDocument(value: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', value === 'dark');
}

const state = $state<{ value: Theme }>({ value: readStored() });
applyToDocument(state.value);

export function getTheme(): Theme {
  return state.value;
}

export function setTheme(next: Theme): void {
  state.value = next;
  applyToDocument(next);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, next);
  }
}

export function toggleTheme(): void {
  setTheme(state.value === 'dark' ? 'light' : 'dark');
}
