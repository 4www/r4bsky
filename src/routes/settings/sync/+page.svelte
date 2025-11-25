<script lang="ts">
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { RefreshCw, Database, CheckCircle2, AlertCircle } from 'lucide-svelte';
  import { locale as localeStore, translate } from '$lib/i18n';
  import { session } from '$lib/state/session';
  import { goto } from '$app/navigation';
  import {
    getR4SyncConfig,
    setR4SyncConfig,
    fetchRadio4000Channel,
    fetchRadio4000Tracks,
    importRadio4000Tracks,
    listTracksByDid,
    getMyDid,
  } from '$lib/services/r4-service';
  import { loadTracksForDid } from '$lib/stores/tracks-db';
  import { onMount } from 'svelte';

  const t = (key: string, vars = {}) => translate($localeStore, key, vars);

  // Config
  let apiEndpoint = $state('https://oupgudlkspsmzkmeovlh.supabase.co');
  let apiKey = $state('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cGd1ZGxrc3BzbXprbWVvdmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM0NTIwNzQsImV4cCI6MjAyOTAyODA3NH0.KAbKFBChJHtxTmOZM2pdeppIyNbcnQkEgSi6RA7OQdo');
  let channelSlug = $state('');

  // State
  let isLoading = $state(false);
  let isImporting = $state(false);
  let error = $state<string | null>(null);
  let channelInfo = $state<any>(null);
  let comparison = $state<{ total: number; imported: number; missing: number } | null>(null);
  let importProgress = $state<{ current: number; total: number; skipped: number } | null>(null);
  let importResult = $state<{ imported: number; skipped: number } | null>(null);
  let importErrors = $state<string[]>([]);

  onMount(async () => {
    // Redirect to account page if not authenticated
    if (!$session?.did) {
      goto('/settings/account');
      return;
    }

    try {
      const config = await getR4SyncConfig();
      if (config) {
        apiEndpoint = config.apiEndpoint;
        apiKey = config.apiKey;
        channelSlug = config.channelSlug;
      }
    } catch (err) {
      // Ignore auth errors on mount
      console.error('Failed to load sync config:', err);
    }
  });

  async function handleLoad() {
    error = null;
    channelInfo = null;
    comparison = null;
    importResult = null;
    isLoading = true;

    try {
      // Save config
      await setR4SyncConfig({ apiEndpoint, apiKey, channelSlug });

      // Fetch channel info only - no need to fetch all tracks yet
      const channel = await fetchRadio4000Channel(apiEndpoint, apiKey, channelSlug);
      if (!channel) {
        error = 'Channel not found';
        return;
      }
      channelInfo = channel;

      // Show ready state - comparison will happen during import
      comparison = {
        total: 0, // Will be computed during import
        imported: 0,
        missing: 0,
      };
    } catch (err) {
      error = (err as Error).message;
    } finally {
      isLoading = false;
    }
  }

  async function handleImport() {
    error = null;
    importResult = null;
    isImporting = true;
    importProgress = null;
    importErrors = [];

    try {
      // Fetch radio4000 tracks to get total count
      const r4Tracks = await fetchRadio4000Tracks(apiEndpoint, apiKey, channelSlug);

      // Update comparison with total before starting import
      comparison = {
        total: r4Tracks.length,
        imported: 0,
        missing: r4Tracks.length,
      };

      const result = await importRadio4000Tracks(
        apiEndpoint,
        apiKey,
        channelSlug,
        (current, total, skipped) => {
          importProgress = { current, total, skipped };
          // Update comparison during import
          comparison = {
            total: r4Tracks.length,
            imported: skipped + current,
            missing: total - current,
          };
        },
        (errorMsg) => {
          importErrors = [...importErrors, errorMsg];
        }
      );

      importResult = result;

      // Final comparison
      comparison = {
        total: r4Tracks.length,
        imported: result.imported + result.skipped,
        missing: 0,
      };

      // Load imported tracks into the reactive collection
      const myDid = await getMyDid();
      await loadTracksForDid(myDid, { reset: true });
    } catch (err) {
      error = (err as Error).message;
    } finally {
      isImporting = false;
      importProgress = null;
    }
  }
</script>

<div class="settings-stack">
  <Card>
    <CardHeader>
      <CardTitle class="card-title-icon">
        <Database class="icon" />
        {t('settings.syncTitle')}
      </CardTitle>
      <CardDescription>
        {t('settings.syncDescription')}
      </CardDescription>
    </CardHeader>
    <CardContent class="content-stack">
      <!-- Error Message -->
      {#if error}
        <div class="alert alert-error">
          <AlertCircle class="icon-sm" />
          <span>{t('settings.syncError', { message: error })}</span>
        </div>
      {/if}

      <!-- Import Success Message -->
      {#if importResult}
        <div class="alert alert-success">
          <CheckCircle2 class="icon-sm" />
          <span>{t('settings.syncImportComplete', importResult)}</span>
        </div>
      {/if}

      <!-- Import Errors -->
      {#if importErrors.length > 0}
        <div class="field-group">
          <h4 class="error-title">Import Errors ({importErrors.length}):</h4>
          <div class="error-list">
            {#each importErrors as errorMsg}
              <div class="error-item">{errorMsg}</div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Channel Slug Input -->
      <div class="field-group">
        <Label for="channel-slug">{t('settings.syncChannelSlugLabel')}</Label>
        <div class="input-row">
          <Input
            id="channel-slug"
            type="text"
            placeholder={t('settings.syncChannelSlugPlaceholder')}
            bind:value={channelSlug}
            class="flex-input"
          />
          <Button onclick={handleLoad} disabled={isLoading || !channelSlug}>
            {#if isLoading}
              <RefreshCw class="icon-sm spin" />
              {t('settings.syncLoading')}
            {:else}
              {t('settings.syncLoadButton')}
            {/if}
          </Button>
        </div>
      </div>

      <!-- Channel Info & Import -->
      {#if channelInfo}
        <div class="channel-section">
          <!-- Channel Name -->
          <div class="channel-info">
            <span class="channel-name">
              {channelInfo.name}
            </span>
            {#if channelInfo.description}
              <p class="channel-desc">{channelInfo.description}</p>
            {/if}
          </div>

          <!-- Comparison Stats (only show if we have data) -->
          {#if comparison && comparison.total > 0}
            <div class="stats-row">
              <span>{comparison.total} tracks total</span>
              <span>{comparison.imported} imported</span>
              {#if comparison.missing > 0}
                <span>{comparison.missing} remaining</span>
              {/if}
            </div>
          {/if}

          <!-- Import Button -->
          <div>
            <Button onclick={handleImport} disabled={isImporting}>
              {#if isImporting}
                <RefreshCw class="icon-sm spin" />
                {#if importProgress}
                  {importProgress.current}/{importProgress.total}
                  {#if importProgress.skipped > 0}
                    ({importProgress.skipped} skipped)
                  {/if}
                {:else}
                  {t('settings.syncImporting')}
                {/if}
              {:else}
                Sync from Radio4000
              {/if}
            </Button>
          </div>
        </div>
      {/if}

      <!-- Config Details (Collapsed) -->
      <details class="config-details">
        <summary>Configuration</summary>
        <div class="config-content">
          <div class="field-group">
            <Label for="api-endpoint" class="label-xs">{t('settings.syncApiEndpoint')}</Label>
            <Input
              id="api-endpoint"
              type="text"
              bind:value={apiEndpoint}
              readonly
              class="input-xs"
            />
          </div>
          <div class="field-group">
            <Label for="api-key" class="label-xs">{t('settings.syncApiKey')}</Label>
            <Input
              id="api-key"
              type="text"
              bind:value={apiKey}
              readonly
              class="input-xs mono"
            />
          </div>
          <p class="footnote">
            {t('settings.syncConfigNote')}
          </p>
        </div>
      </details>
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

  :global(.content-stack) {
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }

  .alert {
    display: flex;
    align-items: flex-start;
    gap: var(--size-2);
    padding: var(--size-3);
    border-radius: var(--radius-2);
  }

  .alert-error {
    background: color-mix(in srgb, var(--destructive) 15%, transparent);
    color: var(--destructive);
  }

  .alert-success {
    background: color-mix(in srgb, var(--green-7) 15%, transparent);
    color: var(--green-7);
  }

  :global(.dark) .alert-success {
    color: var(--green-4);
  }

  .error-title {
    font-weight: var(--font-weight-5);
    color: var(--destructive);
  }

  .error-list {
    max-height: 10rem;
    overflow-y: auto;
    padding: var(--size-3);
    border: var(--border-size-1) solid var(--border);
    border-radius: var(--radius-2);
    background: color-mix(in srgb, var(--destructive) 5%, transparent);
  }

  .error-item {
    color: var(--destructive);
    margin-bottom: var(--size-1);
  }

  .input-row {
    display: flex;
    gap: var(--size-2);
  }

  :global(.flex-input) {
    flex: 1;
  }

  .channel-section {
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
    padding-top: var(--size-4);
    border-top: var(--border-size-1) solid var(--border);
  }

  .channel-name {
    font-weight: var(--font-weight-5);
  }

  .channel-desc {
    color: var(--muted-foreground);
    margin-top: var(--size-1);
  }

  .stats-row {
    display: flex;
    gap: var(--size-4);
    color: var(--muted-foreground);
  }

  .config-details {
    padding-top: var(--size-4);
    border-top: var(--border-size-1) solid var(--border);
  }

  .config-details summary {
    cursor: pointer;
    font-weight: var(--font-weight-5);
    color: var(--muted-foreground);
  }

  .config-details summary:hover {
    color: var(--foreground);
  }

  .config-content {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
    margin-top: var(--size-4);
  }

  :global(.input-xs.mono) {
    font-family: var(--font-mono);
  }

  .footnote {
    color: var(--muted-foreground);
  }

  .icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .icon-sm {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  :global(.spin) {
    animation: var(--animation-spin);
  }
</style>
