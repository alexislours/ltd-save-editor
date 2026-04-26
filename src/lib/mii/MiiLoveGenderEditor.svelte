<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { Entry } from '../sav/types';
  import { LABEL_CLASS } from '../styles';
  import { markDirty, miiState } from './miiEditor.svelte';
  import {
    LOVE_GENDER_OPTIONS,
    readIsLoveGender,
    writeIsLoveGender,
    type LoveGenderOption,
  } from './relations';

  type Props = {
    entry: Entry;
    miiIndex: number;
  };
  let { entry, miiIndex }: Props = $props();

  const tick = $derived(miiState.tick);

  const values = $derived.by(() => {
    void tick;
    return LOVE_GENDER_OPTIONS.map((opt) => readIsLoveGender(entry, miiIndex, opt));
  });

  function toggle(opt: LoveGenderOption, checked: boolean): void {
    if (writeIsLoveGender(entry, miiIndex, opt, checked)) markDirty(entry);
  }
</script>

<div class="block min-w-0">
  <span class={LABEL_CLASS}>{$_('mii.fields.love_gender')}</span>
  <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
    {#each LOVE_GENDER_OPTIONS as opt, i (opt)}
      <label class="inline-flex items-center gap-2 text-sm text-content">
        <input
          type="checkbox"
          class="h-4 w-4 accent-pink-600"
          checked={values[i]}
          onchange={(e) => toggle(opt, e.currentTarget.checked)}
        />
        <span>{$_(`mii.gender.${opt}`)}</span>
      </label>
    {/each}
  </div>
  <span class="mt-1 block text-xs text-content-muted">
    {$_('mii.fields.love_gender_hint')}
  </span>
</div>
