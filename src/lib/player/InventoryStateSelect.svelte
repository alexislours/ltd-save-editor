<script lang="ts">
  import { INPUT_CLASS } from '../styles';
  import EnumSelect from './EnumSelect.svelte';
  import { STATE_OPTIONS } from './stateOptions';

  type Props = {
    value: number;
    onChange: (value: number) => void;
  };

  let { value, onChange }: Props = $props();
</script>

<EnumSelect
  {value}
  {onChange}
  options={STATE_OPTIONS}
  selectClass="{INPUT_CLASS} w-32 text-xs"
  i18nPrefix="player.inventory.state"
/>
