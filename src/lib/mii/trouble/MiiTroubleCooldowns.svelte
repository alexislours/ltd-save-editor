<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { safe } from '$lib/sav/format';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS, PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';
  import { TROUBLE_FIELDS } from './troubleFields';
  import { nowSeconds, parseDateInput, toDateInputValue } from './troubleTime';

  type Props = { selectedIndex: number };
  let { selectedIndex }: Props = $props();

  const mii = $derived(miiAccessor());
  const has = $derived(mii != null && mii.has(TROUBLE_FIELDS.childBirthBlockTime.leaf));

  function read(): bigint {
    if (!mii || !has) return 0n;
    return safe(
      () => mii.getElement(TROUBLE_FIELDS.childBirthBlockTime.leaf, selectedIndex) as bigint,
      0n,
    );
  }
  function write(v: bigint): void {
    if (!mii || !has) return;
    try {
      mii.setElement(TROUBLE_FIELDS.childBirthBlockTime.leaf, selectedIndex, v < 0n ? 0n : v);
    } catch {
      /* skip */
    }
  }
  function bump(addSeconds: number): void {
    const cur = read();
    const base = cur === 0n ? nowSeconds() : cur;
    write(base + BigInt(addSeconds));
  }
  function commitDate(raw: string): void {
    const parsed = parseDateInput(raw);
    if (parsed == null) return;
    write(parsed);
  }

  const cbV = $derived(read());
</script>

{#if has}
  <section class={CARD_CLASS}>
    <h3 class="text-base font-bold text-content-strong">
      {$_('mii.troubles.cooldowns_heading')}
    </h3>
    <div class="mt-4 block min-w-0 max-w-md">
      <span class={LABEL_CLASS}>{$_('mii.troubles.child_birth_block_label')}</span>
      <input
        type="datetime-local"
        class={FORM_INPUT_CLASS}
        value={toDateInputValue(cbV)}
        onchange={(e) => commitDate(e.currentTarget.value)}
      />
      <span class="mt-1 block text-xs text-content-muted">
        {cbV === 0n
          ? $_('mii.troubles.disabled')
          : $_('mii.troubles.epoch_label', {
              values: { seconds: cbV.toString() },
            })}
      </span>
      <div class="mt-1.5 flex flex-wrap gap-1.5">
        <button type="button" class={PILL_BUTTON_CLASS} onclick={() => write(nowSeconds())}>
          {$_('mii.troubles.now_action')}
        </button>
        <button type="button" class={PILL_BUTTON_CLASS} onclick={() => bump(86400)}>
          {$_('mii.troubles.plus_day_action')}
        </button>
        <button type="button" class={PILL_BUTTON_CLASS} onclick={() => write(0n)}>
          {$_('mii.troubles.disable_action')}
        </button>
      </div>
    </div>
  </section>
{/if}
