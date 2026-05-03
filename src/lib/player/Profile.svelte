<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { bindLeaf } from '../sav/bindLeaf.svelte';
  import { enumOptionsFor, type EnumOption } from '../sav/knownKeys';
  import { PLAYER_SCHEMA } from '../sav/schema';
  import { playerAccessor } from '../playerEditor.svelte';
  import { CARD_CLASS, COMPACT_SELECT_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import DateField from './DateField.svelte';
  import EnumSelect from './EnumSelect.svelte';
  import FormFieldWrapper from './FormFieldWrapper.svelte';
  import { HAND_COLORS } from './profileFields';
  import SwatchPicker from './SwatchPicker.svelte';

  const NAME = PLAYER_SCHEMA.Player.Name;
  const ISLAND_NAME = PLAYER_SCHEMA.Player.IslandName;
  const HOW_CALL_NAME = PLAYER_SCHEMA.Player.HowToCallName;
  const HOW_CALL_ISLAND = PLAYER_SCHEMA.Player.HowToCallIslandName;
  const NAME_LANG = PLAYER_SCHEMA.Player.NameRegionLanguageID;
  const ISLAND_LANG = PLAYER_SCHEMA.Player.IslandNameRegionLanguageID;
  const SKIN = PLAYER_SCHEMA.Player.SkinColorIndex;
  const MONEY = PLAYER_SCHEMA.Player.Money;
  const CURRENCY = PLAYER_SCHEMA.Player.Currency;
  const REGION = PLAYER_SCHEMA.Player.Region;
  const REGION_CODE = PLAYER_SCHEMA.Player.RegionCode;
  const BOOT_NUM = PLAYER_SCHEMA.Player.BootNum;
  const PLAY_TIME = PLAYER_SCHEMA.Player.PlayTime;
  const BDAY_DAY = PLAYER_SCHEMA.Player.BirthDay.BirthDay_Day;
  const BDAY_MONTH = PLAYER_SCHEMA.Player.BirthDay.BirthDay_Month;
  const BDAY_YEAR = PLAYER_SCHEMA.Player.BirthDay.BirthDay_Year;
  const FOUNTAIN_LEVEL = PLAYER_SCHEMA.Liberation.FountainLevel;
  const WISHES = PLAYER_SCHEMA.Unknown['0xA32F7E47'];
  const ISLAND_SIZE = PLAYER_SCHEMA.Player.UnlockMapLevel;

  const ISLAND_SIZE_VALUES = [1, 2, 3, 4] as const;

  const name = bindLeaf(playerAccessor, NAME);
  const island = bindLeaf(playerAccessor, ISLAND_NAME);
  const phoneticName = bindLeaf(playerAccessor, HOW_CALL_NAME);
  const phoneticIsland = bindLeaf(playerAccessor, HOW_CALL_ISLAND);
  const nameLang = bindLeaf(playerAccessor, NAME_LANG);
  const islandLang = bindLeaf(playerAccessor, ISLAND_LANG);
  const skin = bindLeaf(playerAccessor, SKIN);
  const money = bindLeaf(playerAccessor, MONEY);
  const currency = bindLeaf(playerAccessor, CURRENCY);
  const region = bindLeaf(playerAccessor, REGION);
  const regionCode = bindLeaf(playerAccessor, REGION_CODE);
  const bootNum = bindLeaf(playerAccessor, BOOT_NUM);
  const playTime = bindLeaf(playerAccessor, PLAY_TIME);
  const fountainLevel = bindLeaf(playerAccessor, FOUNTAIN_LEVEL);
  const wishes = bindLeaf(playerAccessor, WISHES);
  const islandSize = bindLeaf(playerAccessor, ISLAND_SIZE);
  const bdayDay = bindLeaf(playerAccessor, BDAY_DAY);
  const bdayMonth = bindLeaf(playerAccessor, BDAY_MONTH);
  const bdayYear = bindLeaf(playerAccessor, BDAY_YEAR);

  const hasBday = $derived(bdayDay.present && bdayMonth.present && bdayYear.present);

  const anyFound = $derived(
    name.present ||
      island.present ||
      money.present ||
      playTime.present ||
      skin.present ||
      fountainLevel.present ||
      wishes.present ||
      islandSize.present ||
      hasBday,
  );

  const currencyOptions = $derived(currency.present ? enumOptionsFor(CURRENCY.hash) : null);
  const regionOptions = $derived(region.present ? enumOptionsFor(REGION.hash) : null);
  const regionCodeOptions = $derived(regionCode.present ? enumOptionsFor(REGION_CODE.hash) : null);
  const nameLangOptions = $derived(nameLang.present ? enumOptionsFor(NAME_LANG.hash) : null);
  const islandLangOptions = $derived(islandLang.present ? enumOptionsFor(ISLAND_LANG.hash) : null);

  const handSwatches = $derived(
    HAND_COLORS.map((color, i) => ({
      value: i,
      color,
      label: $_(`player.hand_tones.${i}`),
    })),
  );

  function localizeRegion(opt: EnumOption): string {
    const key = `player.regions.${opt.name}`;
    const t = $_(key);
    return t === key ? (opt.label ?? opt.name) : t;
  }

  function writeBoot(raw: string): string | null {
    const trimmed = raw.replace(/[,\s]/g, '');
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return $_('player.errors.non_negative_integer');
    return bootNum.commit(Math.trunc(n));
  }

  function writePlayTime(raw: string): string | null {
    const trimmed = raw.replace(/[,\s]/g, '');
    try {
      const n = BigInt(trimmed);
      if (n < 0n) return $_('player.errors.non_negative_integer');
      return playTime.commit(n);
    } catch {
      return $_('player.errors.invalid_number');
    }
  }

  function writeFountainLevel(raw: string): string | null {
    const trimmed = raw.replace(/[,\s]/g, '');
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return $_('player.errors.non_negative_integer');
    return fountainLevel.commit(Math.trunc(n));
  }

  function writeWishes(raw: string): string | null {
    const trimmed = raw.replace(/[,\s]/g, '');
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return $_('player.errors.non_negative_integer');
    return wishes.commit(Math.trunc(n));
  }

  function formatMoney(v: number | null): string {
    if (v == null) return '';
    if (!Number.isFinite(v)) return '';
    return (v / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const MAX_MONEY_CENTS = 99_999_999;

  function writeMoney(raw: string): string | null {
    const cleaned = raw.replace(/\s/g, '').replace(/,/g, '.');
    const lastDot = cleaned.lastIndexOf('.');
    let intPart: string;
    let fracPart = '';
    if (lastDot >= 0) {
      intPart = cleaned.slice(0, lastDot).replace(/\./g, '');
      fracPart = cleaned.slice(lastDot + 1);
    } else {
      intPart = cleaned.replace(/\./g, '');
    }
    if (intPart === '' && fracPart === '') return $_('player.errors.number');
    if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) {
      return $_('player.errors.non_negative_number');
    }
    const cents = (fracPart + '00').slice(0, 2);
    const totalStr = (intPart || '0') + cents;
    const total = Number(totalStr);
    if (!Number.isFinite(total) || total < 0) return $_('player.errors.non_negative_number');
    if (total > MAX_MONEY_CENTS) return $_('player.errors.money_max');
    return money.commit(total >>> 0);
  }

  function formatPlayTime(seconds: bigint | null): string {
    if (seconds == null) return '';
    const s = Number(seconds);
    if (!Number.isFinite(s) || s < 0) return '';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h.toLocaleString('en-US')}h ${m}m`;
  }

  type ErrKey =
    | 'name'
    | 'island'
    | 'phoneticName'
    | 'phoneticIsland'
    | 'money'
    | 'playTime'
    | 'boot'
    | 'fountainLevel'
    | 'wishes';
  const errors = $state<Record<ErrKey, string | null>>({
    name: null,
    island: null,
    phoneticName: null,
    phoneticIsland: null,
    money: null,
    playTime: null,
    boot: null,
    fountainLevel: null,
    wishes: null,
  });

  const numberInputClass = `${FORM_INPUT_CLASS} font-mono`;
</script>

{#if !anyFound}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.empty_state')}</p>
  </section>
{:else}
  <div class="grid gap-4">
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
                onchange={(e) =>
                  (errors.phoneticIsland = phoneticIsland.commit(e.currentTarget.value))}
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

    {#if money.present || playTime.present || bootNum.present || hasBday}
      <section class={CARD_CLASS}>
        <div class="flex flex-wrap gap-x-8 gap-y-5">
          {#if money.present}
            <FormFieldWrapper
              label={$_('player.money_label')}
              error={errors.money}
              bodyClass="mt-1.5"
            >
              <div class="flex flex-wrap items-stretch gap-2">
                <input
                  type="text"
                  inputmode="numeric"
                  class="{numberInputClass} w-40 max-w-full"
                  value={formatMoney(money.value)}
                  onchange={(e) => (errors.money = writeMoney(e.currentTarget.value))}
                />
                {#if currency.present && currencyOptions && currencyOptions.length > 0}
                  <EnumSelect
                    value={currency.value ?? 0}
                    options={currencyOptions}
                    onChange={(n) => currency.commit(n)}
                    selectClass={COMPACT_SELECT_CLASS}
                    labelFor={(opt) => opt.name}
                  />
                {/if}
              </div>
            </FormFieldWrapper>
          {/if}

          {#if hasBday}
            <FormFieldWrapper label={$_('player.birthday_label')}>
              <DateField dayLeaf={BDAY_DAY} monthLeaf={BDAY_MONTH} yearLeaf={BDAY_YEAR} />
            </FormFieldWrapper>
          {/if}

          {#if playTime.present}
            {@const playTimeValue = playTime.value ?? 0n}
            <FormFieldWrapper label={$_('player.play_time_label')} error={errors.playTime}>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <input
                  type="text"
                  inputmode="numeric"
                  class="{numberInputClass} w-28"
                  value={playTimeValue.toString()}
                  onchange={(e) => (errors.playTime = writePlayTime(e.currentTarget.value))}
                />
                <span class="text-xs text-content">
                  {$_('player.play_time_unit')} ·
                  <span class="font-mono text-content-strong">
                    {formatPlayTime(playTimeValue)}
                  </span>
                </span>
              </div>
            </FormFieldWrapper>
          {/if}

          {#if bootNum.present}
            <FormFieldWrapper label={$_('player.boots_label')} error={errors.boot}>
              <input
                type="text"
                inputmode="numeric"
                class="{numberInputClass} w-20"
                value={(bootNum.value ?? 0).toString()}
                onchange={(e) => (errors.boot = writeBoot(e.currentTarget.value))}
              />
            </FormFieldWrapper>
          {/if}
        </div>
      </section>
    {/if}

    {#if fountainLevel.present || wishes.present}
      <section class={CARD_CLASS}>
        <h3 class="mb-4 text-sm font-semibold text-content-strong">
          {$_('player.fountain_section')}
        </h3>
        <div class="flex flex-wrap gap-x-8 gap-y-5">
          {#if fountainLevel.present}
            <FormFieldWrapper
              label={$_('player.fountain_level_label')}
              error={errors.fountainLevel}
            >
              <input
                type="text"
                inputmode="numeric"
                class="{numberInputClass} w-28"
                value={(fountainLevel.value ?? 0).toString()}
                onchange={(e) => (errors.fountainLevel = writeFountainLevel(e.currentTarget.value))}
              />
            </FormFieldWrapper>
          {/if}

          {#if wishes.present}
            <FormFieldWrapper label={$_('player.wishes_label')} error={errors.wishes}>
              <input
                type="text"
                inputmode="numeric"
                class="{numberInputClass} w-28"
                value={(wishes.value ?? 0).toString()}
                onchange={(e) => (errors.wishes = writeWishes(e.currentTarget.value))}
              />
            </FormFieldWrapper>
          {/if}
        </div>
      </section>
    {/if}

    {#if region.present || regionCode.present || nameLang.present || islandLang.present}
      <section class={CARD_CLASS}>
        <h3 class="mb-4 text-sm font-semibold text-content-strong">
          {$_('player.region_section')}
        </h3>
        <div class="grid gap-4 sm:grid-cols-2">
          {#if region.present}
            {@const regionValue = region.value ?? 0}
            <FormFieldWrapper label={$_('player.region_label')}>
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
                    class={`${FORM_INPUT_CLASS} font-mono`}
                    value={`0x${(regionValue >>> 0).toString(16).padStart(8, '0')}`}
                    onchange={(e) => {
                      const n = Number.parseInt(e.currentTarget.value, 16);
                      if (Number.isFinite(n)) region.commit(n >>> 0);
                    }}
                  />
                {/if}
              </div>
            </FormFieldWrapper>
          {/if}
          {#if regionCode.present}
            {@const regionCodeValue = regionCode.value ?? 0}
            <FormFieldWrapper label={$_('player.region_code_label')}>
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
                    class={`${FORM_INPUT_CLASS} font-mono`}
                    value={`0x${(regionCodeValue >>> 0).toString(16).padStart(8, '0')}`}
                    onchange={(e) => {
                      const n = Number.parseInt(e.currentTarget.value, 16);
                      if (Number.isFinite(n)) regionCode.commit(n >>> 0);
                    }}
                  />
                {/if}
              </div>
            </FormFieldWrapper>
          {/if}
          {#if nameLang.present}
            {@const nameLangValue = nameLang.value ?? 0}
            <FormFieldWrapper label={$_('player.name_language_label')}>
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
                    class={`${FORM_INPUT_CLASS} font-mono`}
                    value={`0x${(nameLangValue >>> 0).toString(16).padStart(8, '0')}`}
                    onchange={(e) => {
                      const n = Number.parseInt(e.currentTarget.value, 16);
                      if (Number.isFinite(n)) nameLang.commit(n >>> 0);
                    }}
                  />
                {/if}
              </div>
            </FormFieldWrapper>
          {/if}
          {#if islandLang.present}
            {@const islandLangValue = islandLang.value ?? 0}
            <FormFieldWrapper label={$_('player.island_language_label')}>
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
                    class={`${FORM_INPUT_CLASS} font-mono`}
                    value={`0x${(islandLangValue >>> 0).toString(16).padStart(8, '0')}`}
                    onchange={(e) => {
                      const n = Number.parseInt(e.currentTarget.value, 16);
                      if (Number.isFinite(n)) islandLang.commit(n >>> 0);
                    }}
                  />
                {/if}
              </div>
            </FormFieldWrapper>
          {/if}
        </div>
      </section>
    {/if}
  </div>
{/if}
