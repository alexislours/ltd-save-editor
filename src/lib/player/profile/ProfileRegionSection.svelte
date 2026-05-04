<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { bindLeaf } from '$lib/sav/bindLeaf.svelte';
  import { enumOptionsFor, type EnumOption } from '$lib/sav/knownKeys';
  import { player } from '$lib/sav/schema';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import { CARD_CLASS, COMPACT_SELECT_CLASS, FORM_INPUT_MONO_CLASS } from '$lib/ui/styles';
  import EnumSelect from '$lib/ui/fields/EnumSelect.svelte';
  import FormFieldWrapper from '$lib/ui/fields/FormFieldWrapper.svelte';
  import { writeHexUint32 } from './profileFields';

  const NAME_LANG = player.Player.NameRegionLanguageID;
  const ISLAND_LANG = player.Player.IslandNameRegionLanguageID;
  const REGION = player.Player.Region;
  const REGION_CODE = player.Player.RegionCode;

  const nameLang = bindLeaf(playerAccessor, NAME_LANG);
  const islandLang = bindLeaf(playerAccessor, ISLAND_LANG);
  const region = bindLeaf(playerAccessor, REGION);
  const regionCode = bindLeaf(playerAccessor, REGION_CODE);

  const visible = $derived(
    region.present || regionCode.present || nameLang.present || islandLang.present,
  );

  const regionOptions = $derived(region.present ? enumOptionsFor(REGION.hash) : null);
  const regionCodeOptions = $derived(regionCode.present ? enumOptionsFor(REGION_CODE.hash) : null);
  const nameLangOptions = $derived(nameLang.present ? enumOptionsFor(NAME_LANG.hash) : null);
  const islandLangOptions = $derived(islandLang.present ? enumOptionsFor(ISLAND_LANG.hash) : null);

  const errors = $state<{
    region: string | null;
    regionCode: string | null;
    nameLang: string | null;
    islandLang: string | null;
  }>({
    region: null,
    regionCode: null,
    nameLang: null,
    islandLang: null,
  });

  function localizeRegion(opt: EnumOption): string {
    const key = `player.regions.${opt.name}`;
    const t = $_(key);
    return t === key ? (opt.label ?? opt.name) : t;
  }

  function hexValue(v: number): string {
    return `0x${(v >>> 0).toString(16).padStart(8, '0')}`;
  }
</script>

{#if visible}
  <section class={CARD_CLASS}>
    <h3 class="mb-4 text-sm font-semibold text-content-strong">
      {$_('player.region_section')}
    </h3>
    <div class="grid gap-4 sm:grid-cols-2">
      {#if region.present}
        {@const regionValue = region.value ?? 0}
        <FormFieldWrapper label={$_('player.region_label')} error={errors.region}>
          <div class="max-w-xs">
            {#if regionOptions && regionOptions.length > 0}
              <EnumSelect
                value={regionValue}
                options={regionOptions}
                onChange={(n) => region.commit(n)}
                selectClass={COMPACT_SELECT_CLASS}
                labelFor={localizeRegion}
              />
            {:else}
              <input
                type="text"
                class={FORM_INPUT_MONO_CLASS}
                value={hexValue(regionValue)}
                onchange={(e) =>
                  (errors.region = writeHexUint32(e.currentTarget.value, (v) => region.commit(v)))}
              />
            {/if}
          </div>
        </FormFieldWrapper>
      {/if}
      {#if regionCode.present}
        {@const regionCodeValue = regionCode.value ?? 0}
        <FormFieldWrapper label={$_('player.region_code_label')} error={errors.regionCode}>
          <div class="max-w-xs">
            {#if regionCodeOptions && regionCodeOptions.length > 0}
              <EnumSelect
                value={regionCodeValue}
                options={regionCodeOptions}
                onChange={(n) => regionCode.commit(n)}
                selectClass={COMPACT_SELECT_CLASS}
              />
            {:else}
              <input
                type="text"
                class={FORM_INPUT_MONO_CLASS}
                value={hexValue(regionCodeValue)}
                onchange={(e) =>
                  (errors.regionCode = writeHexUint32(e.currentTarget.value, (v) =>
                    regionCode.commit(v),
                  ))}
              />
            {/if}
          </div>
        </FormFieldWrapper>
      {/if}
      {#if nameLang.present}
        {@const nameLangValue = nameLang.value ?? 0}
        <FormFieldWrapper label={$_('player.name_language_label')} error={errors.nameLang}>
          <div class="max-w-xs">
            {#if nameLangOptions && nameLangOptions.length > 0}
              <EnumSelect
                value={nameLangValue}
                options={nameLangOptions}
                onChange={(n) => nameLang.commit(n)}
                selectClass={COMPACT_SELECT_CLASS}
              />
            {:else}
              <input
                type="text"
                class={FORM_INPUT_MONO_CLASS}
                value={hexValue(nameLangValue)}
                onchange={(e) =>
                  (errors.nameLang = writeHexUint32(e.currentTarget.value, (v) =>
                    nameLang.commit(v),
                  ))}
              />
            {/if}
          </div>
        </FormFieldWrapper>
      {/if}
      {#if islandLang.present}
        {@const islandLangValue = islandLang.value ?? 0}
        <FormFieldWrapper label={$_('player.island_language_label')} error={errors.islandLang}>
          <div class="max-w-xs">
            {#if islandLangOptions && islandLangOptions.length > 0}
              <EnumSelect
                value={islandLangValue}
                options={islandLangOptions}
                onChange={(n) => islandLang.commit(n)}
                selectClass={COMPACT_SELECT_CLASS}
              />
            {:else}
              <input
                type="text"
                class={FORM_INPUT_MONO_CLASS}
                value={hexValue(islandLangValue)}
                onchange={(e) =>
                  (errors.islandLang = writeHexUint32(e.currentTarget.value, (v) =>
                    islandLang.commit(v),
                  ))}
              />
            {/if}
          </div>
        </FormFieldWrapper>
      {/if}
    </div>
  </section>
{/if}
