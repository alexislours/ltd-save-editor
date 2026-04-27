<script lang="ts">
  import { _ } from 'svelte-i18n';
  import AppLayout from '../lib/AppLayout.svelte';
  import Card from '../lib/Card.svelte';

  const repoUrl = 'https://github.com/alexislours/ltd-save-editor';
  const issuesUrl = 'https://github.com/alexislours/ltd-save-editor/issues/new';
  const discordUrl = 'https://discord.gg/YHFNTvXrdE';
  const stableUrl = 'https://ltd-save-editor.pages.dev';
  const betaUrl = 'https://beta.ltd-save-editor.pages.dev';

  const ITEM_IDS = [
    'brick',
    'backup',
    'upload',
    'sav_files',
    'advanced',
    'hashes',
    'stable_beta',
    'translation',
    'bug',
    'cant_do_x',
  ] as const;

  const linkClass = 'font-medium text-brand underline-offset-2 hover:underline';
  const listClass = 'mt-2 space-y-1.5 pl-5 text-sm text-content [&>li]:list-disc';
  const paragraphClass = 'text-sm text-content';
  const followUpClass = 'mt-3 text-sm text-content';
</script>

<AppLayout>
  <div class="space-y-6">
    <Card title={$_('faq.title')} description={$_('faq.subtitle')}>
      <div class="divide-y divide-edge/40">
        {#each ITEM_IDS as id (id)}
          <details class="group py-3 first:pt-0 last:pb-0">
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-1 text-sm font-bold text-content-strong outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            >
              <span>{$_(`faq.items.${id}.q`)}</span>
              <span
                aria-hidden="true"
                class="text-content-muted transition-transform group-open:rotate-90"
              >
                ›
              </span>
            </summary>
            <div class="mt-3 space-y-3">
              {#if id === 'brick'}
                <p class={paragraphClass}>{$_('faq.items.brick.intro')}</p>
                <p class={paragraphClass}>{$_('faq.items.brick.a1')}</p>
                <ul class={listClass}>
                  <li>{$_('faq.items.brick.a2')}</li>
                  <li>{$_('faq.items.brick.a3')}</li>
                </ul>
              {:else if id === 'backup'}
                <p class={paragraphClass}>{$_('faq.items.backup.a')}</p>
              {:else if id === 'upload'}
                <p class={paragraphClass}>{$_('faq.items.upload.a1')}</p>
                <p class={paragraphClass}>
                  {$_('faq.items.upload.a2_prefix')}
                  <a href={repoUrl} target="_blank" rel="noopener noreferrer" class={linkClass}>
                    {$_('faq.items.upload.a2_link')}
                  </a>{$_('faq.items.upload.a2_suffix')}
                </p>
              {:else if id === 'sav_files'}
                <p class={paragraphClass}>{$_('faq.items.sav_files.intro')}</p>
                <ul class={listClass}>
                  <li>
                    <strong class="text-content-strong">Player.sav</strong>
                    {$_('faq.items.sav_files.player')}
                  </li>
                  <li>
                    <strong class="text-content-strong">Mii.sav</strong>
                    {$_('faq.items.sav_files.mii')}
                  </li>
                  <li>
                    <strong class="text-content-strong">Map.sav</strong>
                    {$_('faq.items.sav_files.map')}
                  </li>
                </ul>
                <p class={followUpClass}>{$_('faq.items.sav_files.outro')}</p>
              {:else if id === 'advanced'}
                <p class={paragraphClass}>{$_('faq.items.advanced.a1')}</p>
                <p class={paragraphClass}>{$_('faq.items.advanced.a2')}</p>
              {:else if id === 'hashes'}
                <p class={paragraphClass}>{$_('faq.items.hashes.a')}</p>
              {:else if id === 'stable_beta'}
                <ul class={listClass}>
                  <li>
                    <strong class="text-content-strong"
                      >{$_('faq.items.stable_beta.stable_label')}</strong
                    >
                    (<a href={stableUrl} target="_blank" rel="noopener noreferrer" class={linkClass}
                      >ltd-save-editor.pages.dev</a
                    >) - {$_('faq.items.stable_beta.stable_body')}
                  </li>
                  <li>
                    <strong class="text-content-strong"
                      >{$_('faq.items.stable_beta.beta_label')}</strong
                    >
                    (<a href={betaUrl} target="_blank" rel="noopener noreferrer" class={linkClass}
                      >beta.ltd-save-editor.pages.dev</a
                    >) - {$_('faq.items.stable_beta.beta_body')}
                  </li>
                </ul>
                <p class={followUpClass}>{$_('faq.items.stable_beta.switch_hint')}</p>
              {:else if id === 'translation'}
                <p class={paragraphClass}>
                  {$_('faq.items.translation.a_prefix')}
                  <a
                    href="{repoUrl}#adding-a-localization"
                    target="_blank"
                    rel="noopener noreferrer"
                    class={linkClass}
                  >
                    {$_('faq.items.translation.a_link')}
                  </a>{$_('faq.items.translation.a_suffix')}
                </p>
              {:else if id === 'bug'}
                <p class={paragraphClass}>
                  {$_('faq.items.bug.intro_prefix')}
                  <a href={issuesUrl} target="_blank" rel="noopener noreferrer" class={linkClass}>
                    {$_('faq.items.bug.intro_link')}
                  </a>{$_('faq.items.bug.intro_suffix')}
                </p>
                <ul class={listClass}>
                  <li>{$_('faq.items.bug.item_what')}</li>
                  <li>{$_('faq.items.bug.item_actual')}</li>
                  <li>{$_('faq.items.bug.item_version')}</li>
                  <li>{$_('faq.items.bug.item_screenshot')}</li>
                  <li>{$_('faq.items.bug.item_save')}</li>
                </ul>
                <p class={followUpClass}>
                  {$_('faq.items.bug.discord_prefix')}
                  <a href={discordUrl} target="_blank" rel="noopener noreferrer" class={linkClass}>
                    {$_('faq.items.bug.discord_link')}
                  </a>{$_('faq.items.bug.discord_suffix')}
                </p>
              {:else if id === 'cant_do_x'}
                <p class={paragraphClass}>{$_('faq.items.cant_do_x.intro')}</p>
                <ul class={listClass}>
                  <li>{$_('faq.items.cant_do_x.item_unmapped')}</li>
                  <li>{$_('faq.items.cant_do_x.item_unsafe')}</li>
                </ul>
                <p class={followUpClass}>{$_('faq.items.cant_do_x.outro')}</p>
              {/if}
            </div>
          </details>
        {/each}
      </div>
    </Card>
  </div>
</AppLayout>
