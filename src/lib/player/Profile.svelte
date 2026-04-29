<script lang="ts">
  import {
    getEnum,
    getInt,
    getInt64,
    getString,
    getUInt,
    getUInt64,
    setEnum,
    setInt,
    setInt64,
    setString,
    setUInt,
    setUInt64,
    stringEncodedSize,
  } from '../sav/codec';
  import { DataType } from '../sav/dataType';
  import { murmur3_x86_32 } from '../sav/hash';
  import { _ } from 'svelte-i18n';
  import { enumOptionsFor, type EnumOption } from '../sav/knownKeys';
  import type { Entry } from '../sav/types';
  import { markDirty, playerState } from '../playerEditor.svelte';
  import { CARD_CLASS, COMPACT_SELECT_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import DateField from './DateField.svelte';
  import EnumSelect from './EnumSelect.svelte';
  import EntryEditor from './EntryEditor.svelte';
  import FormFieldWrapper from './FormFieldWrapper.svelte';
  import { buildEntryMap } from './inventoryHelpers';
  import { HAND_COLORS } from './profileFields';
  import { fieldWriteError } from './scalarFieldAccess';
  import SwatchPicker from './SwatchPicker.svelte';

  type Props = { entries: Entry[] };
  let { entries }: Props = $props();

  const byHash = $derived(buildEntryMap(entries));

  const find = (n: string): Entry | null => byHash.get(murmur3_x86_32(n) >>> 0) ?? null;
  const findHash = (h: number): Entry | null => byHash.get(h >>> 0) ?? null;

  const name = $derived(find('Player.Name'));
  const islandName = $derived(find('Player.IslandName'));
  const howCallName = $derived(find('Player.HowToCallName'));
  const howCallIsland = $derived(find('Player.HowToCallIslandName'));
  const nameLang = $derived(find('Player.NameRegionLanguageID'));
  const islandLang = $derived(find('Player.IslandNameRegionLanguageID'));
  const skin = $derived(find('Player.SkinColorIndex'));

  const money = $derived(find('Player.Money'));
  const currency = $derived(find('Player.Currency'));

  const region = $derived(find('Player.Region'));
  const regionCode = $derived(find('Player.RegionCode'));
  const bootNum = $derived(find('Player.BootNum'));
  const playTime = $derived(find('Player.PlayTime'));

  const bdayDay = $derived(findHash(0xdb7786bb));
  const bdayMonth = $derived(findHash(0xc754bef3));
  const bdayYear = $derived(findHash(0x11996629));

  const fountainLevel = $derived(find('Liberation.FountainLevel'));
  const wishes = $derived(findHash(0xa32f7e47));

  const islandSize = $derived(findHash(0x870a807c));
  const ISLAND_SIZE_VALUES = [1, 2, 3, 4] as const;

  function readIslandSize(entry: Entry): number {
    switch (entry.type) {
      case DataType.Enum:
        return getEnum(entry);
      case DataType.Int:
        return getInt(entry);
      default:
        return getUInt(entry);
    }
  }
  function writeIslandSize(entry: Entry, n: number): void {
    switch (entry.type) {
      case DataType.Enum:
        setEnum(entry, n);
        break;
      case DataType.Int:
        setInt(entry, n);
        break;
      default:
        setUInt(entry, n);
    }
    markDirty(entry);
  }

  const islandSizeValue = $derived.by(
    () => (void playerState.tick, islandSize ? readIslandSize(islandSize) : 0),
  );

  const anyFound = $derived(
    name != null ||
      islandName != null ||
      money != null ||
      playTime != null ||
      skin != null ||
      fountainLevel != null ||
      wishes != null ||
      islandSize != null ||
      (bdayDay != null && bdayMonth != null && bdayYear != null),
  );

  function setSkin(v: number): void {
    if (!skin) return;
    setUInt(skin, v);
    markDirty(skin);
  }

  function commitString(entry: Entry, value: string): string | null {
    return fieldWriteError(() => {
      stringEncodedSize(entry.type, value);
      setString(entry, value);
      markDirty(entry);
    });
  }

  function readNumber(entry: Entry): number | bigint | null {
    switch (entry.type) {
      case DataType.UInt:
      case DataType.Int:
      case DataType.Enum:
        return getUInt(entry);
      case DataType.Int64:
        return getInt64(entry);
      case DataType.UInt64:
        return getUInt64(entry);
      default:
        return null;
    }
  }

  function writeNumber(entry: Entry, raw: string): string | null {
    const trimmed = raw.replace(/[,\s]/g, '');
    try {
      switch (entry.type) {
        case DataType.UInt:
        case DataType.Enum: {
          const n = Number(trimmed);
          if (!Number.isFinite(n) || n < 0) return $_('player.errors.non_negative_integer');
          setUInt(entry, Math.trunc(n));
          break;
        }
        case DataType.Int: {
          const n = Number(trimmed);
          if (!Number.isFinite(n)) return $_('player.errors.integer');
          setUInt(entry, Math.trunc(n) >>> 0);
          break;
        }
        case DataType.Int64: {
          setInt64(entry, BigInt(trimmed));
          break;
        }
        case DataType.UInt64: {
          const n = BigInt(trimmed);
          if (n < 0n) return $_('player.errors.non_negative_integer');
          setUInt64(entry, n);
          break;
        }
        default:
          return $_('player.errors.unsupported_type');
      }
      markDirty(entry);
      return null;
    } catch {
      return $_('player.errors.invalid_number');
    }
  }

  function formatMoney(v: number | bigint | null): string {
    if (v == null) return '';
    const n = typeof v === 'bigint' ? Number(v) : v;
    if (!Number.isFinite(n)) return '';
    return (n / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const MAX_MONEY_CENTS = 99_999_999;

  function writeMoney(entry: Entry, raw: string): string | null {
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
    try {
      switch (entry.type) {
        case DataType.UInt:
        case DataType.Int:
        case DataType.Enum:
          setUInt(entry, Math.trunc(total) >>> 0);
          break;
        case DataType.Int64:
          setInt64(entry, BigInt(totalStr));
          break;
        case DataType.UInt64:
          setUInt64(entry, BigInt(totalStr));
          break;
        default:
          return $_('player.errors.unsupported_type');
      }
      markDirty(entry);
      return null;
    } catch {
      return $_('player.errors.invalid_number');
    }
  }

  function formatPlayTime(seconds: number | bigint | null): string {
    if (seconds == null) return '';
    const s = typeof seconds === 'bigint' ? Number(seconds) : seconds;
    if (!Number.isFinite(s) || s < 0) return '';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h.toLocaleString('en-US')}h ${m}m`;
  }

  const moneyValue = $derived.by(() => (void playerState.tick, money ? readNumber(money) : null));
  const playTimeValue = $derived.by(
    () => (void playerState.tick, playTime ? readNumber(playTime) : null),
  );
  const bootValue = $derived.by(
    () => (void playerState.tick, bootNum ? readNumber(bootNum) : null),
  );
  const fountainLevelValue = $derived.by(
    () => (void playerState.tick, fountainLevel ? readNumber(fountainLevel) : null),
  );
  const wishesValue = $derived.by(
    () => (void playerState.tick, wishes ? readNumber(wishes) : null),
  );
  const nameValue = $derived.by(() => (void playerState.tick, name ? getString(name) : ''));
  const islandValue = $derived.by(
    () => (void playerState.tick, islandName ? getString(islandName) : ''),
  );
  const phoneticNameValue = $derived.by(
    () => (void playerState.tick, howCallName ? getString(howCallName) : ''),
  );
  const phoneticIslandValue = $derived.by(
    () => (void playerState.tick, howCallIsland ? getString(howCallIsland) : ''),
  );

  const currencyOptions = $derived(currency ? enumOptionsFor(currency.hash) : null);
  const currencyRaw = $derived.by(() => (void playerState.tick, currency ? getEnum(currency) : 0));

  const regionOptions = $derived(region ? enumOptionsFor(region.hash) : null);
  const regionRaw = $derived.by(() => (void playerState.tick, region ? getEnum(region) : 0));

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

{#snippet textField(entry: Entry, label: string, value: string, key: ErrKey)}
  <FormFieldWrapper {label} error={errors[key]} bodyClass="">
    <input
      type="text"
      class={FORM_INPUT_CLASS}
      {value}
      onchange={(e) => (errors[key] = commitString(entry, e.currentTarget.value))}
    />
  </FormFieldWrapper>
{/snippet}

{#snippet numberField(
  entry: Entry,
  label: string,
  value: number | bigint | null,
  widthClass: string,
  key: ErrKey,
)}
  <FormFieldWrapper {label} error={errors[key]}>
    <input
      type="text"
      inputmode="numeric"
      class="{numberInputClass} {widthClass}"
      value={value == null ? '' : value.toString()}
      onchange={(e) => (errors[key] = writeNumber(entry, e.currentTarget.value))}
    />
  </FormFieldWrapper>
{/snippet}

{#if !anyFound}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.empty_state')}</p>
  </section>
{:else}
  <div class="grid gap-4">
    <section class={CARD_CLASS}>
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="grid gap-3">
          {#if name}
            {@render textField(name, $_('player.name_label'), nameValue, 'name')}
          {/if}
          {#if howCallName}
            {@render textField(
              howCallName,
              $_('player.name_pronounced_label'),
              phoneticNameValue,
              'phoneticName',
            )}
          {/if}
        </div>

        <div class="grid gap-3">
          {#if islandName}
            {@render textField(islandName, $_('player.island_label'), islandValue, 'island')}
          {/if}
          {#if howCallIsland}
            {@render textField(
              howCallIsland,
              $_('player.island_pronounced_label'),
              phoneticIslandValue,
              'phoneticIsland',
            )}
          {/if}
        </div>
      </div>

      {#if skin}
        <div class="mt-6 border-t border-edge/40 pt-5">
          <span class={LABEL_CLASS}>{$_('player.skin_tone_label')}</span>
          <div class="mt-2">
            <SwatchPicker swatches={handSwatches} value={getUInt(skin)} onChange={setSkin} />
          </div>
        </div>
      {/if}

      {#if islandSize}
        <div class="mt-6 border-t border-edge/40 pt-5">
          <FormFieldWrapper label={$_('player.island_size_label')}>
            <select
              class={COMPACT_SELECT_CLASS}
              value={islandSizeValue}
              onchange={(e) => {
                const n = Number.parseInt(e.currentTarget.value, 10);
                if (Number.isFinite(n)) writeIslandSize(islandSize!, n);
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

    {#if money || playTime || bootNum || (bdayDay && bdayMonth && bdayYear)}
      <section class={CARD_CLASS}>
        <div class="flex flex-wrap gap-x-8 gap-y-5">
          {#if money}
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
                  value={formatMoney(moneyValue)}
                  onchange={(e) => (errors.money = writeMoney(money!, e.currentTarget.value))}
                />
                {#if currency && currencyOptions && currencyOptions.length > 0}
                  <EnumSelect
                    value={currencyRaw}
                    options={currencyOptions}
                    onChange={(n) => {
                      setEnum(currency!, n);
                      markDirty(currency!);
                    }}
                    selectClass={COMPACT_SELECT_CLASS}
                    labelFor={(opt) => opt.name}
                  />
                {/if}
              </div>
            </FormFieldWrapper>
          {/if}

          {#if bdayDay && bdayMonth && bdayYear}
            <FormFieldWrapper label={$_('player.birthday_label')}>
              <DateField day={bdayDay} month={bdayMonth} year={bdayYear} />
            </FormFieldWrapper>
          {/if}

          {#if playTime}
            <FormFieldWrapper label={$_('player.play_time_label')} error={errors.playTime}>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <input
                  type="text"
                  inputmode="numeric"
                  class="{numberInputClass} w-28"
                  value={playTimeValue == null ? '' : playTimeValue.toString()}
                  onchange={(e) =>
                    (errors.playTime = writeNumber(playTime!, e.currentTarget.value))}
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

          {#if bootNum}
            {@render numberField(bootNum, $_('player.boots_label'), bootValue, 'w-20', 'boot')}
          {/if}
        </div>
      </section>
    {/if}

    {#if fountainLevel || wishes}
      <section class={CARD_CLASS}>
        <h3 class="mb-4 text-sm font-semibold text-content-strong">
          {$_('player.fountain_section')}
        </h3>
        <div class="flex flex-wrap gap-x-8 gap-y-5">
          {#if fountainLevel}
            {@render numberField(
              fountainLevel,
              $_('player.fountain_level_label'),
              fountainLevelValue,
              'w-28',
              'fountainLevel',
            )}
          {/if}

          {#if wishes}
            {@render numberField(wishes, $_('player.wishes_label'), wishesValue, 'w-28', 'wishes')}
          {/if}
        </div>
      </section>
    {/if}

    {#if region || regionCode || nameLang || islandLang}
      <section class={CARD_CLASS}>
        <h3 class="mb-4 text-sm font-semibold text-content-strong">
          {$_('player.region_section')}
        </h3>
        <div class="grid gap-4 sm:grid-cols-2">
          {#if region}
            <FormFieldWrapper label={$_('player.region_label')}>
              <div class="max-w-xs">
                {#if regionOptions && regionOptions.length > 0}
                  <EnumSelect
                    value={regionRaw}
                    options={regionOptions}
                    onChange={(n) => {
                      setEnum(region!, n);
                      markDirty(region!);
                    }}
                    selectClass={COMPACT_SELECT_CLASS}
                    labelFor={localizeRegion}
                  />
                {:else}
                  <EntryEditor entry={region} />
                {/if}
              </div>
            </FormFieldWrapper>
          {/if}
          {#if regionCode}
            <FormFieldWrapper label={$_('player.region_code_label')}>
              <div class="max-w-xs">
                <EntryEditor entry={regionCode} />
              </div>
            </FormFieldWrapper>
          {/if}
          {#if nameLang}
            <FormFieldWrapper label={$_('player.name_language_label')}>
              <div class="max-w-xs">
                <EntryEditor entry={nameLang} />
              </div>
            </FormFieldWrapper>
          {/if}
          {#if islandLang}
            <FormFieldWrapper label={$_('player.island_language_label')}>
              <div class="max-w-xs">
                <EntryEditor entry={islandLang} />
              </div>
            </FormFieldWrapper>
          {/if}
        </div>
      </section>
    {/if}
  </div>
{/if}
