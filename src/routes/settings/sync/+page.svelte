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

      // Fetch channel
      const channel = await fetchRadio4000Channel(apiEndpoint, apiKey, channelSlug);
      if (!channel) {
        error = 'Channel not found';
        return;
      }
      channelInfo = channel;

      // Fetch radio4000 tracks
      const r4Tracks = await fetchRadio4000Tracks(apiEndpoint, apiKey, channelSlug);

      // Fetch imported tracks
      const myDid = await getMyDid();
      const importedResult = await listTracksByDid(myDid, { limit: 100 });
      let importedTracks = [...importedResult.tracks];

      let cursor = importedResult.cursor;
      while (cursor) {
        const result = await listTracksByDid(myDid, { cursor, limit: 100 });
        importedTracks.push(...result.tracks);
        cursor = result.cursor;
      }

      // Compare
      const importedUrls = new Set(importedTracks.map(t => t.url.toLowerCase().trim()));
      const missing = r4Tracks.filter(r4Track => !importedUrls.has(r4Track.url.toLowerCase().trim()));

      comparison = {
        total: r4Tracks.length,
        imported: r4Tracks.length - missing.length,
        missing: missing.length,
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
      const result = await importRadio4000Tracks(
        apiEndpoint,
        apiKey,
        channelSlug,
        (current, total, skipped) => {
          importProgress = { current, total, skipped };
        },
        (errorMsg) => {
          importErrors = [...importErrors, errorMsg];
        }
      );

      importResult = result;

      // Reload comparison
      await handleLoad();
    } catch (err) {
      error = (err as Error).message;
    } finally {
      isImporting = false;
      importProgress = null;
    }
  }
</script>

<div class="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Database class="h-5 w-5" />
        {t('settings.syncTitle')}
      </CardTitle>
      <CardDescription>
        {t('settings.syncDescription')}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Error Message -->
      {#if error}
        <div class="flex items-start gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          <AlertCircle class="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{t('settings.syncError', { message: error })}</span>
        </div>
      {/if}

      <!-- Import Success Message -->
      {#if importResult}
        <div class="flex items-start gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 class="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{t('settings.syncImportComplete', importResult)}</span>
        </div>
      {/if}

      <!-- Import Errors -->
      {#if importErrors.length > 0}
        <div class="space-y-2">
          <h4 class="text-sm font-medium text-destructive">Import Errors ({importErrors.length}):</h4>
          <div class="max-h-40 overflow-y-auto border rounded-md p-3 bg-destructive/5">
            {#each importErrors as errorMsg}
              <div class="text-xs text-destructive mb-1">{errorMsg}</div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Channel Slug Input -->
      <div class="space-y-2">
        <Label for="channel-slug">{t('settings.syncChannelSlugLabel')}</Label>
        <div class="flex gap-2">
          <Input
            id="channel-slug"
            type="text"
            placeholder={t('settings.syncChannelSlugPlaceholder')}
            bind:value={channelSlug}
            class="flex-1"
          />
          <Button onclick={handleLoad} disabled={isLoading || !channelSlug}>
            {#if isLoading}
              <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
              {t('settings.syncLoading')}
            {:else}
              {t('settings.syncLoadButton')}
            {/if}
          </Button>
        </div>
      </div>

      <!-- Channel Info & Comparison -->
      {#if channelInfo && comparison}
        <div class="border-t pt-4 space-y-4">
          <!-- Channel Name -->
          <div class="text-sm">
            <span class="font-medium">
              {t('settings.syncChannelInfo', { name: channelInfo.name, total: comparison.total })}
            </span>
          </div>

          <!-- Comparison Stats -->
          <div class="space-y-2">
            <h3 class="text-sm font-medium">{t('settings.syncComparisonTitle')}</h3>
            <div class="flex gap-4 text-sm">
              <div class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4" />
                <span>
                  {t('settings.syncStatusImported', { count: comparison.imported })}
                </span>
              </div>
              <div class="flex items-center gap-2">
                {#if comparison.missing > 0}
                  <AlertCircle class="h-4 w-4" />
                  <span>
                    {t('settings.syncStatusMissing', { count: comparison.missing })}
                  </span>
                {:else}
                  <CheckCircle2 class="h-4 w-4" />
                  <span>
                    {t('settings.syncAllImported')}
                  </span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Import Button -->
          {#if comparison.missing > 0}
            <div>
              <Button onclick={handleImport} disabled={isImporting}>
                {#if isImporting}
                  <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
                  {#if importProgress}
                    {t('settings.syncImportProgress', importProgress)}
                  {:else}
                    {t('settings.syncImporting')}
                  {/if}
                {:else}
                  {t('settings.syncImportButton')}
                {/if}
              </Button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Config Details (Collapsed) -->
      <details class="border-t pt-4">
        <summary class="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Configuration
        </summary>
        <div class="mt-4 space-y-3">
          <div class="space-y-2">
            <Label for="api-endpoint" class="text-xs">{t('settings.syncApiEndpoint')}</Label>
            <Input
              id="api-endpoint"
              type="text"
              bind:value={apiEndpoint}
              readonly
              class="text-xs"
            />
          </div>
          <div class="space-y-2">
            <Label for="api-key" class="text-xs">{t('settings.syncApiKey')}</Label>
            <Input
              id="api-key"
              type="text"
              bind:value={apiKey}
              readonly
              class="text-xs font-mono"
            />
          </div>
          <p class="text-xs text-muted-foreground">
            {t('settings.syncConfigNote')}
          </p>
        </div>
      </details>
    </CardContent>
  </Card>
</div>
