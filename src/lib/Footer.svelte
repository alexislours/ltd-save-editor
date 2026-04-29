<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { track } from './analytics';

  const repoUrl = 'https://github.com/alexislours/ltd-save-editor';
  const issuesUrl = 'https://github.com/alexislours/ltd-save-editor/issues/new';
  const discordUrl = 'https://discord.gg/YHFNTvXrdE';
  const licenseUrl = 'https://github.com/alexislours/ltd-save-editor/blob/main/LICENSE';

  const linkClass =
    'inline-flex items-center gap-1.5 font-medium leading-none text-content hover:text-content-strong underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 rounded';
</script>

<footer
  class="mt-auto border-t border-edge/40 bg-surface/40 px-4 py-5 text-xs text-content-muted sm:px-6 sm:py-6"
>
  <div
    class="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <a
        href={repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        onclick={() => track('external_link', { target: 'github' })}
        class={linkClass}
        aria-label={$_('footer.github_aria')}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current">
          <path
            d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
        {$_('footer.github')}
      </a>
      <a
        href={issuesUrl}
        target="_blank"
        rel="noopener noreferrer"
        onclick={() => track('external_link', { target: 'issues' })}
        class={linkClass}
      >
        {$_('footer.report_issue')}
      </a>
      <a
        href={discordUrl}
        target="_blank"
        rel="noopener noreferrer"
        onclick={() => track('external_link', { target: 'discord' })}
        class={linkClass}
      >
        {$_('footer.discord')}
      </a>
      <a
        href={licenseUrl}
        target="_blank"
        rel="noopener noreferrer"
        onclick={() => track('external_link', { target: 'license' })}
        class={linkClass}
      >
        {$_('footer.license')}
      </a>
    </div>

    <p class="text-content-muted sm:text-right">{$_('about.disclaimer')}</p>
  </div>
</footer>
