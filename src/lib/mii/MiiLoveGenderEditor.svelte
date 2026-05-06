<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { LABEL_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from './miiEditor.svelte';
  import { genderLabel } from './miiLabelList.svelte';
  import {
    LOVE_GENDER_OPTIONS,
    readIsLoveGender,
    writeIsLoveGender,
    type LoveGenderOption,
  } from './relations/relations';

  type Props = {
    miiIndex: number;
  };
  let { miiIndex }: Props = $props();

  const values = $derived.by(() => {
    const mii = miiAccessor();
    if (!mii) return LOVE_GENDER_OPTIONS.map(() => false);
    return LOVE_GENDER_OPTIONS.map((opt) => readIsLoveGender(mii, miiIndex, opt));
  });

  function toggle(opt: LoveGenderOption, checked: boolean): void {
    const mii = miiAccessor();
    if (!mii) return;
    writeIsLoveGender(mii, miiIndex, opt, checked);
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
        <span>{genderLabel(opt, $locale) ?? opt}</span>
      </label>
    {/each}
  </div>
  <span class="mt-1 block text-xs text-content-muted">
    {$_('mii.fields.love_gender_hint')}
  </span>
</div>
