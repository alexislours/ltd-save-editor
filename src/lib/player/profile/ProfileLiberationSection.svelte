<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { bindLeaf } from '$lib/sav/bindLeaf.svelte';
  import { player } from '$lib/sav/schema';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import { CARD_CLASS, FORM_INPUT_MONO_CLASS } from '$lib/ui/styles';
  import FormFieldWrapper from '$lib/ui/fields/FormFieldWrapper.svelte';
  import { writeNonNegativeInt } from './profileFields';

  const FOUNTAIN_LEVEL = player.Liberation.FountainLevel;
  const WISHES = player.Liberation.LiberateRightStock;

  const fountainLevel = bindLeaf(playerAccessor, FOUNTAIN_LEVEL);
  const wishes = bindLeaf(playerAccessor, WISHES);

  const visible = $derived(fountainLevel.present || wishes.present);

  const errors = $state<{ fountainLevel: string | null; wishes: string | null }>({
    fountainLevel: null,
    wishes: null,
  });
</script>

{#if visible}
  <section class={CARD_CLASS}>
    <h3 class="mb-4 text-sm font-semibold text-content-strong">
      {$_('player.fountain_section')}
    </h3>
    <div class="flex flex-wrap gap-x-8 gap-y-5">
      {#if fountainLevel.present}
        <FormFieldWrapper label={$_('player.fountain_level_label')} error={errors.fountainLevel}>
          <input
            type="text"
            inputmode="numeric"
            class="{FORM_INPUT_MONO_CLASS} w-28"
            value={(fountainLevel.value ?? 0).toString()}
            onchange={(e) =>
              (errors.fountainLevel = writeNonNegativeInt(e.currentTarget.value, (v) =>
                fountainLevel.commit(v),
              ))}
          />
        </FormFieldWrapper>
      {/if}

      {#if wishes.present}
        <FormFieldWrapper label={$_('player.wishes_label')} error={errors.wishes}>
          <input
            type="text"
            inputmode="numeric"
            class="{FORM_INPUT_MONO_CLASS} w-28"
            value={(wishes.value ?? 0).toString()}
            onchange={(e) =>
              (errors.wishes = writeNonNegativeInt(e.currentTarget.value, (v) => wishes.commit(v)))}
          />
        </FormFieldWrapper>
      {/if}
    </div>
  </section>
{/if}
