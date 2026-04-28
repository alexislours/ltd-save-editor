<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS } from '../styles';
  import MiiElementEditor from './MiiElementEditor.svelte';
  import MiiFoodPicker from './MiiFoodPicker.svelte';
  import MiiGivenFlagPicker from './MiiGivenFlagPicker.svelte';
  import MiiLoveGenderEditor from './MiiLoveGenderEditor.svelte';
  import MiiPersonalityEditor from './MiiPersonalityEditor.svelte';
  import MiiRankedFoodPicker from './MiiRankedFoodPicker.svelte';
  import MiiRelationsTable from './MiiRelationsTable.svelte';
  import MiiSlotSelector from './MiiSlotSelector.svelte';
  import MiiVoiceEditor from './MiiVoiceEditor.svelte';
  import MiiWordsEditor from './MiiWordsEditor.svelte';
  import { miiState } from './miiEditor.svelte';
  import { MII_SECTIONS, type MiiField } from './miiFields';
  import { populatedMiiIndices } from './populated';

  const VOICE_FIELD_NAMES = [
    'Mii.Voice.PresetType',
    'Mii.Voice.Speed',
    'Mii.Voice.Pitch',
    'Mii.Voice.Formant',
    'Mii.Voice.Tension',
    'Mii.Voice.Intonation',
  ] as const;

  type Props = {
    entries: Entry[];
    selectedIndex?: number | null;
  };
  let { entries, selectedIndex = $bindable(null) }: Props = $props();

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });

  const LOVE_GENDER_HASH = murmur3_x86_32('Mii.MiiMisc.FaceInfo.IsLoveGender') >>> 0;
  const loveGenderEntry = $derived(byHash.get(LOVE_GENDER_HASH) ?? null);

  const hasPopulatedSlot = $derived.by(() => {
    void miiState.tick;
    return populatedMiiIndices(byHash).length > 0;
  });

  const voiceEntriesByName = $derived.by(() => {
    const m = new SvelteMap<string, Entry>();
    for (const name of VOICE_FIELD_NAMES) {
      const h = murmur3_x86_32(name) >>> 0;
      const e = byHash.get(h);
      if (e) m.set(name, e);
    }
    return m;
  });

  function resolveFields(fields: MiiField[] | undefined) {
    const out: { field: MiiField; entry: Entry }[] = [];
    if (!fields) return out;
    for (const f of fields) {
      const e = byHash.get(f.hash);
      if (!e) continue;
      if (e.type !== f.expectedType) continue;
      out.push({ field: f, entry: e });
    }
    return out;
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
  <MiiSlotSelector {entries} bind:selectedIndex />

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
          {@const byName = new Map(sec.resolved.map((r) => [r.field.name, r.entry]))}
          <div class="mt-4">
            <MiiPersonalityEditor miiIndex={selectedIndex} entriesByName={byName} />
          </div>
        {:else if sec.resolved.length > 0}
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            {#each sec.resolved as r (r.field.hash)}
              <MiiElementEditor entry={r.entry} index={selectedIndex} field={r.field} />
            {/each}
            {#if sec.titleKey === 'identity' && loveGenderEntry}
              <MiiLoveGenderEditor entry={loveGenderEntry} miiIndex={selectedIndex} />
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
              {#each sec.resolvedSpoiler as r (r.field.hash)}
                {#if sec.titleKey === 'food'}
                  <MiiFoodPicker entry={r.entry} index={selectedIndex} field={r.field} />
                {:else}
                  <MiiElementEditor entry={r.entry} index={selectedIndex} field={r.field} />
                {/if}
              {/each}
            </div>
          </details>
        {/if}
        {#if sec.resolvedPostSpoiler.length > 0}
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            {#each sec.resolvedPostSpoiler as r (r.field.hash)}
              {#if sec.titleKey === 'food' && r.field.name === 'Mii.MiiMisc.EatInfo.RankedFoodId.Id'}
                <MiiRankedFoodPicker entry={r.entry} index={selectedIndex} field={r.field} />
              {:else if sec.titleKey === 'food' && r.field.name === 'Mii.MiiMisc.EatInfo.GivenFlag'}
                <MiiGivenFlagPicker entry={r.entry} index={selectedIndex} field={r.field} />
              {:else}
                <MiiElementEditor entry={r.entry} index={selectedIndex} field={r.field} />
              {/if}
            {/each}
          </div>
        {/if}
      </section>
    {/each}

    {#if voiceEntriesByName.size > 0}
      <section class={CARD_CLASS}>
        <h3 class="text-base font-bold text-content-strong">{$_('mii.sections.voice')}</h3>
        <p class="mt-0.5 text-xs text-content-muted">{$_('mii.sections.voice_caption')}</p>
        <div class="mt-4">
          <MiiVoiceEditor miiIndex={selectedIndex} entriesByName={voiceEntriesByName} />
        </div>
      </section>
    {/if}

    <section class={CARD_CLASS}>
      <h3 class="text-base font-bold text-content-strong">{$_('mii.sections.words')}</h3>
      <p class="mt-0.5 text-xs text-content-muted">{$_('mii.sections.words_caption')}</p>
      <div class="mt-4">
        <MiiWordsEditor {entries} miiIndex={selectedIndex} />
      </div>
    </section>

    <MiiRelationsTable {entries} miiIndex={selectedIndex} />
  {/if}
</div>
