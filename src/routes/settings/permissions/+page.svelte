<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Loader2, Shield } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';

  let working = $state(false);
  let permissionError = $state('');
  const t = (key, vars = {}) => translate($locale, key, vars);

  async function managePermissions() {
    try {
      working = true;
      permissionError = '';
      console.log('Requesting permissions...');
      await bskyOAuth.requestScopes();
      console.log('Permissions requested (should have redirected)');
      // If we reach here without redirect, something went wrong
      permissionError = 'Expected to redirect but did not. Check console for errors.';
    } catch (e) {
      console.error('Permission request error:', e);
      permissionError = String(e?.message || e || 'Failed to request permissions');
    } finally {
      working = false;
    }
  }
</script>

<div class="settings-stack">
  <Card>
    <CardHeader>
      <CardTitle class="card-title-icon">
        <Shield class="icon" />
        {t('settings.permissionsTitle')}
      </CardTitle>
      <CardDescription>
        {t('settings.permissionsDescription')}
      </CardDescription>
    </CardHeader>
    <CardContent class="content-stack-sm">
      <div class="info-panel">
        <p class="info-panel-title">{t('settings.permissionsAtProtocolLabel')}</p>
        <div class="permission-list">
          <div class="permission-item">
            <p class="mono">com.radio4000.track</p>
            <p class="muted">{t('settings.permissionsActionsCreateUpdateDelete')}</p>
          </div>
          <div class="permission-item">
            <p class="mono">com.radio4000.favorite</p>
            <p class="muted">{t('settings.permissionsActionsCreateDelete')}</p>
          </div>
          <div class="permission-item">
            <p class="mono">com.radio4000.profile</p>
            <p class="muted">{t('settings.permissionsActionsCreateUpdateDelete')}</p>
          </div>
        </div>
      </div>
      <Button onclick={managePermissions} disabled={working} variant="outline" class="full-width">
        {#if working}
          <Loader2 class="icon-sm spin" />
          {t('settings.permissionsWorking')}
        {:else}
          <Shield class="icon-sm" />
          {t('settings.permissionsButton')}
        {/if}
      </Button>
      <p class="footnote">
        {t('settings.permissionsFootnote')}
      </p>
      {#if permissionError}
        <div class="error-box">
          {permissionError}
        </div>
      {/if}
    </CardContent>
  </Card>
</div>

<style>
  .settings-stack {
    display: flex;
    flex-direction: column;
    gap: var(--size-fluid-3);
  }

  .card-title-icon {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }

  :global(.content-stack-sm) {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
  }

  .info-panel {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
    padding: var(--size-3);
    background: color-mix(in srgb, var(--muted) 50%, transparent);
    border-radius: var(--radius-3);
  }

  .info-panel-title {
    font-weight: var(--font-weight-6);
    margin-bottom: var(--size-2);
  }

  .permission-list {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }

  .permission-item {
    padding-left: var(--size-2);
    border-left: var(--border-size-2) solid var(--border);
  }

  .mono {
    font-family: var(--font-mono);
  }

  .muted {
    color: var(--muted-foreground);
  }

  :global(.full-width) {
    width: 100%;
  }

  .footnote {
    color: var(--muted-foreground);
  }

  .error-box {
    padding: var(--size-3);
    background: color-mix(in srgb, var(--destructive) 15%, transparent);
    border-radius: var(--radius-2);
  }

  .icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .icon-sm {
    width: 1rem;
    height: 1rem;
  }

  :global(.spin) {
    animation: var(--animation-spin);
  }
</style>
