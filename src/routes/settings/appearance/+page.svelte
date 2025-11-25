<script lang="ts">
  import { session } from '$lib/state/session';
  import { theme } from '$lib/state/theme';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Label } from '$lib/components/ui/label';
  import { Sun, Moon, MonitorSmartphone } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  const t = (key: string, vars = {}) => translate($locale, key, vars);

  onMount(() => {
    if (!$session?.did) {
      goto('/settings/account');
    }
  });
</script>

<div class="settings-stack">
  <Card>
    <CardHeader>
      <CardTitle class="card-title-icon">
        <MonitorSmartphone class="icon" />
        {t('settings.appearanceThemeModeTitle')}
      </CardTitle>
      <CardDescription>
        {t('settings.appearanceThemeModeDescription')}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <fieldset class="field-group">
        <Label>{t('settings.appearanceSelectMode')}</Label>
        <div class="mode-grid">
          <button
            type="button"
            onclick={() => theme.setMode('auto')}
            disabled={$theme.mode === 'auto'}
            class="mode-btn"
            class:active={$theme.mode === 'auto'}
          >
            <MonitorSmartphone class="icon" />
            <span>{t('settings.appearanceModeAuto')}</span>
          </button>
          <button
            type="button"
            onclick={() => theme.setMode('light')}
            disabled={$theme.mode === 'light'}
            class="mode-btn"
            class:active={$theme.mode === 'light'}
          >
            <Sun class="icon" />
            <span>{t('settings.appearanceModeLight')}</span>
          </button>
          <button
            type="button"
            onclick={() => theme.setMode('dark')}
            disabled={$theme.mode === 'dark'}
            class="mode-btn"
            class:active={$theme.mode === 'dark'}
          >
            <Moon class="icon" />
            <span>{t('settings.appearanceModeDark')}</span>
          </button>
        </div>
      </fieldset>
    </CardContent>
  </Card>
</div>

<style>
  .settings-stack {
    display: flex;
    flex-direction: column;
    gap: var(--size-fluid-2);
  }

  .card-title-icon {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
    border: none;
    padding: 0;
    margin: 0;
  }

  .mode-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--size-fluid-2);
  }

  .mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-2);
    padding: var(--size-3);
    border: var(--border-size-2) solid var(--border);
    border-radius: var(--radius-3);
    background: transparent;
    color: var(--foreground);
    transition: all 0.15s var(--ease-2);
    cursor: pointer;
  }

  .mode-btn:hover:not(:disabled) {
    background: var(--foreground);
    color: var(--background);
    border-color: transparent;
  }

  .mode-btn.active {
    background: var(--foreground);
    color: var(--background);
    border-color: var(--foreground);
  }

  .mode-btn:disabled {
    cursor: default;
  }

  .mode-btn span {
    font-weight: var(--font-weight-5);
  }

  .icon {
    width: 1.25rem;
    height: 1.25rem;
  }
</style>
