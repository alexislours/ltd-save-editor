<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { bindLeaf } from '$lib/sav/bindLeaf.svelte';
  import { player } from '$lib/sav/schema';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import { CARD_CLASS, COMPACT_SELECT_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '$lib/ui/styles';
  import FormFieldWrapper from '$lib/ui/fields/FormFieldWrapper.svelte';
  import { HAND_COLORS, ISLAND_SIZE_VALUES } from './profileFields';
  import SwatchPicker from '$lib/ui/fields/SwatchPicker.svelte';

  const NAME = player.Player.Name;
  const ISLAND_NAME = player.Player.IslandName;
  const HOW_CALL_NAME = player.Player.HowToCallName;
  const HOW_CALL_ISLAND = player.Player.HowToCallIslandName;
  const SKIN = player.Player.SkinColorIndex;
  const ISLAND_SIZE = player.Player.UnlockMapLevel;

  const name = bindLeaf(playerAccessor, NAME);
  const island = bindLeaf(playerAccessor, ISLAND_NAME);
  const phoneticName = bindLeaf(playerAccessor, HOW_CALL_NAME);
  const phoneticIsland = bindLeaf(playerAccessor, HOW_CALL_ISLAND);
  const skin = bindLeaf(playerAccessor, SKIN);
  const islandSize = bindLeaf(playerAccessor, ISLAND_SIZE);

  const handSwatches = $derived(
    HAND_COLORS.map((color, i) => ({
      value: i,
      color,
      label: $_(`player.hand_tones.${i}`),
    })),
  );

  const errors = $state<{
    name: string | null;
    island: string | null;
    phoneticName: string | null;
    phoneticIsland: string | null;
  }>({
    name: null,
    island: null,
    phoneticName: null,
    phoneticIsland: null,
  });
</script>

<section class={CARD_CLASS}>
  <div class="grid gap-5 sm:grid-cols-2">
    <div class="grid gap-3">
      {#if name.present}
        <FormFieldWrapper label={$_('player.name_label')} error={errors.name} bodyClass="">
          <input
            type="text"
            class={FORM_INPUT_CLASS}
            value={name.value ?? ''}
            onchange={(e) => (errors.name = name.commit(e.currentTarget.value))}
          />
        </FormFieldWrapper>
      {/if}
      {#if phoneticName.present}
        <FormFieldWrapper
          label={$_('player.name_pronounced_label')}
          error={errors.phoneticName}
          bodyClass=""
        >
          <input
            type="text"
            class={FORM_INPUT_CLASS}
            value={phoneticName.value ?? ''}
            onchange={(e) => (errors.phoneticName = phoneticName.commit(e.currentTarget.value))}
          />
        </FormFieldWrapper>
      {/if}
    </div>

    <div class="grid gap-3">
      {#if island.present}
        <FormFieldWrapper label={$_('player.island_label')} error={errors.island} bodyClass="">
          <input
            type="text"
            class={FORM_INPUT_CLASS}
            value={island.value ?? ''}
            onchange={(e) => (errors.island = island.commit(e.currentTarget.value))}
          />
        </FormFieldWrapper>
      {/if}
      {#if phoneticIsland.present}
        <FormFieldWrapper
          label={$_('player.island_pronounced_label')}
          error={errors.phoneticIsland}
          bodyClass=""
        >
          <input
            type="text"
            class={FORM_INPUT_CLASS}
            value={phoneticIsland.value ?? ''}
            onchange={(e) => (errors.phoneticIsland = phoneticIsland.commit(e.currentTarget.value))}
          />
        </FormFieldWrapper>
      {/if}
    </div>
  </div>

  {#if skin.present}
    <div class="mt-6 border-t border-edge/40 pt-5">
      <span class={LABEL_CLASS}>{$_('player.skin_tone_label')}</span>
      <div class="mt-2">
        <SwatchPicker
          swatches={handSwatches}
          value={skin.value ?? 0}
          onChange={(v) => skin.commit(v)}
        />
      </div>
    </div>
  {/if}

  {#if islandSize.present}
    {@const islandSizeValue = islandSize.value ?? 0}
    <div class="mt-6 border-t border-edge/40 pt-5">
      <FormFieldWrapper label={$_('player.island_size_label')}>
        <select
          class={COMPACT_SELECT_CLASS}
          value={islandSizeValue}
          onchange={(e) => {
            const n = Number.parseInt(e.currentTarget.value, 10);
            if (Number.isFinite(n)) islandSize.commit(n);
          }}
        >
          {#each ISLAND_SIZE_VALUES as v (v)}
            <option value={v}>{$_(`player.island_size_options.${v}`)}</option>
          {/each}
          {#if !ISLAND_SIZE_VALUES.includes(islandSizeValue as 1 | 2 | 3 | 4)}
            <option value={islandSizeValue}>{islandSizeValue}</option>
          {/if}
        </select>
      </FormFieldWrapper>
    </div>
  {/if}
</section>
