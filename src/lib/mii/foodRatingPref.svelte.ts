const STORAGE_KEY = 'ltd-save-editor:food-rating-shown';

function readStored(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

const state = $state<{ value: boolean }>({ value: readStored() });

export function getFoodRatingShown(): boolean {
  return state.value;
}

export function setFoodRatingShown(next: boolean): void {
  state.value = next;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  }
}
