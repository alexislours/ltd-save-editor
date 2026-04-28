<script lang="ts">
  import { untrack } from 'svelte';
  import { INPUT_CLASS } from '../styles';
  import EnumSelect from './EnumSelect.svelte';
  import { OBTAINED_HASH, STATE_OPTIONS } from './stateOptions';

  type Props = {
    value: number;
    onChange: (value: number) => void;
  };

  let { value, onChange }: Props = $props();

  let pulseToken = $state(0);
  let prev = untrack(() => value >>> 0);

  $effect(() => {
    const next = value >>> 0;
    untrack(() => {
      if (next !== prev && next === OBTAINED_HASH) pulseToken++;
      prev = next;
    });
  });
</script>

<div class="state-select-wrap relative inline-flex">
  <EnumSelect
    {value}
    {onChange}
    options={STATE_OPTIONS}
    selectClass="{INPUT_CLASS} w-32 text-xs"
    i18nPrefix="player.inventory.state"
  />
  {#key pulseToken}
    {#if pulseToken > 0}
      <span aria-hidden="true" class="state-pulse"></span>
      <span aria-hidden="true" class="state-spark">✓</span>
    {/if}
  {/key}
</div>

<style>
  .state-pulse {
    position: absolute;
    inset: 0;
    border-radius: 0.5rem;
    pointer-events: none;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55);
    animation: state-pulse 600ms ease-out;
  }

  .state-spark {
    position: absolute;
    top: 50%;
    right: 0.5rem;
    transform: translateY(-50%);
    pointer-events: none;
    color: rgb(34, 197, 94);
    font-weight: 700;
    font-size: 0.85rem;
    text-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
    animation: state-spark 700ms ease-out forwards;
  }

  @keyframes state-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55);
    }
    100% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
    }
  }

  @keyframes state-spark {
    0% {
      opacity: 0;
      transform: translateY(-30%) scale(0.6);
    }
    25% {
      opacity: 1;
      transform: translateY(-50%) scale(1.15);
    }
    60% {
      opacity: 1;
      transform: translateY(-50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(-90%) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .state-pulse,
    .state-spark {
      animation: none;
      display: none;
    }
  }
</style>
