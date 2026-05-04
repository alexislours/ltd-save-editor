import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

export const prerender = false;

export function load(): never {
  redirect(307, resolve('/player'));
}
