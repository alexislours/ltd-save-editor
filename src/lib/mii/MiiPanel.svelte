<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { bindLeaf } from '$lib/sav/bindLeaf.svelte';
  import { mii, MII_SCHEMA } from '$lib/sav/schema';
  import type { SchemaLeaf } from '$lib/sav/schema/leaf';
  import { CARD_CLASS } from '$lib/ui/styles';
  import MiiElementEditor from './MiiElementEditor.svelte';
  import MiiFoodPicker from './MiiFoodPicker.svelte';
  import MiiGivenFlagPicker from './MiiGivenFlagPicker.svelte';
  import MiiLoveGenderEditor from './MiiLoveGenderEditor.svelte';
  import MiiPersonalityEditor from './MiiPersonalityEditor.svelte';
  import MiiRankedFoodPicker from './MiiRankedFoodPicker.svelte';
  import MiiRelationsTable from './relations/MiiRelationsTable.svelte';
  import MiiSlotSelector from './MiiSlotSelector.svelte';
  import MiiVoiceEditor from './MiiVoiceEditor.svelte';
  import MiiWordsEditor from './MiiWordsEditor.svelte';
  import { miiAccessor } from './miiEditor.svelte';
  import { MII_SECTIONS, type MiiField } from './miiFields';
  import { populatedMiiIndices } from './ownership/populated';

  const VOICE_LEAVES = [
    MII_SCHEMA.Mii.Voice.PresetType,
    MII_SCHEMA.Mii.Voice.Speed,
    MII_SCHEMA.Mii.Voice.Pitch,
    MII_SCHEMA.Mii.Voice.Formant,
    MII_SCHEMA.Mii.Voice.Tension,
    MII_SCHEMA.Mii.Voice.Intonation,
  ] as const;

  type Props = {
    selectedIndex?: number | null;
  };
  let { selectedIndex = $bindable(null) }: Props = $props();

  const accessor = $derived(miiAccessor());
  const loveGender = bindLeaf(miiAccessor, mii.Mii.MiiMisc.FaceInfo.IsLoveGender);

  const hasPopulatedSlot = $derived(accessor != null && populatedMiiIndices(accessor).length > 0);

  const presentVoiceLeaves = $derived.by<SchemaLeaf[]>(() => {
    if (!accessor) return [];
    return VOICE_LEAVES.filter((leaf) => accessor.has(leaf));
  });

  function resolveFields(fields: MiiField[] | undefined): MiiField[] {
    if (!accessor || !fields) return [];
    return fields.filter((f) => accessor.has(f.leaf));
  }

  const sectionsResolved = $derived.by(() => {
    return MII_SECTIONS.map((sec) => ({
      ...sec,
      resolved: resolveFields(sec.fields),
      resolvedSpoiler: resolveFields(sec.spoilerFields),
      resolvedPostSpoiler: resolveFields(sec.postSpoilerFields),
    })).filter(
      (sec) =>
        sec.resolved.length > 0 ||
        sec.resolvedSpoiler.length > 0 ||
        sec.resolvedPostSpoiler.length > 0,
    );
  });
</script>

<div class="grid grid-cols-1 gap-4">
  <MiiSlotSelector bind:selectedIndex />

  {#if hasPopulatedSlot && selectedIndex != null}
    {#each sectionsResolved as sec (sec.titleKey)}
      <section class={CARD_CLASS}>
        <h3 class="text-base font-bold text-content-strong">
          {$_(`mii.sections.${sec.titleKey}`)}
        </h3>
        {#if sec.descriptionKey}
          <p class="mt-0.5 text-xs text-content-muted">
            {$_(`mii.sections.${sec.descriptionKey}`)}
          </p>
        {/if}
        {#if sec.titleKey === 'personality'}
          {@const leaves = sec.resolved.map((f) => f.leaf)}
          <div class="mt-4">
            <MiiPersonalityEditor miiIndex={selectedIndex} {leaves} />
          </div>
        {:else if sec.resolved.length > 0}
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            {#each sec.resolved as field (field.leaf.hash)}
              <MiiElementEditor index={selectedIndex} {field} />
            {/each}
            {#if sec.titleKey === 'identity' && loveGender.present}
              <MiiLoveGenderEditor miiIndex={selectedIndex} />
            {/if}
          </div>
        {/if}
        {#if sec.resolvedSpoiler.length > 0}
          <details class="group mt-3 rounded-md border border-edge/60 bg-surface-muted p-3">
            <summary
              class="flex cursor-pointer list-none items-start justify-between gap-3 select-none"
            >
              <span class="flex items-start gap-2 text-sm text-warn">
                <span aria-hidden="true" class="leading-5">⚠</span>
                <span class="flex flex-col gap-0.5">
                  <span class="font-bold">{$_('mii.spoiler.warning')}</span>
                  <span class="text-xs font-normal"
                    >{$_(`mii.spoiler.captions.${sec.titleKey}`)}</span
                  >
                </span>
              </span>
              <span class="shrink-0 text-xs font-normal text-warn">
                <span class="group-open:hidden">{$_('mii.spoiler.show')}</span>
                <span class="hidden group-open:inline">{$_('mii.spoiler.hide')}</span>
              </span>
            </summary>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              {#each sec.resolvedSpoiler as field (field.leaf.hash)}
                {#if sec.titleKey === 'food'}
                  <MiiFoodPicker index={selectedIndex} {field} />
                {:else}
                  <MiiElementEditor index={selectedIndex} {field} />
                {/if}
              {/each}
            </div>
          </details>
        {/if}
        {#if sec.resolvedPostSpoiler.length > 0}
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            {#each sec.resolvedPostSpoiler as field (field.leaf.hash)}
              {#if sec.titleKey === 'food' && field.leaf === MII_SCHEMA.Mii.MiiMisc.EatInfo.RankedFoodId.Id}
                <MiiRankedFoodPicker index={selectedIndex} {field} />
              {:else if sec.titleKey === 'food' && field.leaf === MII_SCHEMA.Mii.MiiMisc.EatInfo.GivenFlag}
                <MiiGivenFlagPicker index={selectedIndex} {field} />
              {:else}
                <MiiElementEditor index={selectedIndex} {field} />
              {/if}
            {/each}
          </div>
        {/if}
      </section>
    {/each}

    {#if presentVoiceLeaves.length > 0}
      <section class={CARD_CLASS}>
        <h3 class="text-base font-bold text-content-strong">{$_('mii.sections.voice')}</h3>
        <p class="mt-0.5 text-xs text-content-muted">{$_('mii.sections.voice_caption')}</p>
        <div class="mt-4">
          <MiiVoiceEditor miiIndex={selectedIndex} leaves={presentVoiceLeaves} />
        </div>
      </section>
    {/if}

    <section class={CARD_CLASS}>
      <h3 class="text-base font-bold text-content-strong">{$_('mii.sections.words')}</h3>
      <p class="mt-0.5 text-xs text-content-muted">{$_('mii.sections.words_caption')}</p>
      <div class="mt-4">
        <MiiWordsEditor miiIndex={selectedIndex} />
      </div>
    </section>

    <MiiRelationsTable miiIndex={selectedIndex} />
  {/if}
</div>
