<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { bindLeaf } from '$lib/sav/bindLeaf.svelte';
  import { enumOptionsFor } from '$lib/sav/knownKeys';
  import { player } from '$lib/sav/schema';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import { CARD_CLASS, COMPACT_SELECT_CLASS, FORM_INPUT_MONO_CLASS } from '$lib/ui/styles';
  import DateField from '$lib/ui/fields/DateField.svelte';
  import EnumSelect from '$lib/ui/fields/EnumSelect.svelte';
  import FormFieldWrapper from '$lib/ui/fields/FormFieldWrapper.svelte';
  import {
    formatMoney,
    formatPlayTime,
    writeMoney,
    writeNonNegativeBigInt,
    writeNonNegativeInt,
  } from './profileFields';

  const MONEY = player.Player.Money;
  const CURRENCY = player.Player.Currency;
  const BOOT_NUM = player.Player.BootNum;
  const PLAY_TIME = player.Player.PlayTime;
  const BDAY_DAY = player.Player.BirthDay.BirthDay_Day;
  const BDAY_MONTH = player.Player.BirthDay.BirthDay_Month;
  const BDAY_YEAR = player.Player.BirthDay.BirthDay_Year;

  const money = bindLeaf(playerAccessor, MONEY);
  const currency = bindLeaf(playerAccessor, CURRENCY);
  const bootNum = bindLeaf(playerAccessor, BOOT_NUM);
  const playTime = bindLeaf(playerAccessor, PLAY_TIME);
  const bdayDay = bindLeaf(playerAccessor, BDAY_DAY);
  const bdayMonth = bindLeaf(playerAccessor, BDAY_MONTH);
  const bdayYear = bindLeaf(playerAccessor, BDAY_YEAR);

  const hasBday = $derived(bdayDay.present && bdayMonth.present && bdayYear.present);
  const visible = $derived(money.present || playTime.present || bootNum.present || hasBday);

  const currencyOptions = $derived(currency.present ? enumOptionsFor(CURRENCY.hash) : null);

  const errors = $state<{ money: string | null; playTime: string | null; boot: string | null }>({
    money: null,
    playTime: null,
    boot: null,
  });
</script>

{#if visible}
  <section class={CARD_CLASS}>
    <div class="flex flex-wrap gap-x-8 gap-y-5">
      {#if money.present}
        <FormFieldWrapper label={$_('player.money_label')} error={errors.money} bodyClass="mt-1.5">
          <div class="flex flex-wrap items-stretch gap-2">
            <input
              type="text"
              inputmode="numeric"
              class="{FORM_INPUT_MONO_CLASS} w-40 max-w-full"
              value={formatMoney(money.value)}
              onchange={(e) =>
                (errors.money = writeMoney(e.currentTarget.value, (v) => money.commit(v)))}
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
              class="{FORM_INPUT_MONO_CLASS} w-28"
              value={playTimeValue.toString()}
              onchange={(e) =>
                (errors.playTime = writeNonNegativeBigInt(e.currentTarget.value, (v) =>
                  playTime.commit(v),
                ))}
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
            class="{FORM_INPUT_MONO_CLASS} w-20"
            value={(bootNum.value ?? 0).toString()}
            onchange={(e) =>
              (errors.boot = writeNonNegativeInt(e.currentTarget.value, (v) => bootNum.commit(v)))}
          />
        </FormFieldWrapper>
      {/if}
    </div>
  </section>
{/if}
