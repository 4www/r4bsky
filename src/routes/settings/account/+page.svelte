<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import SignInForm from '$lib/components/SignInForm.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import { LogOut, Loader2, Download, Trash2, AlertCircle, Shield } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { locale, translate } from '$lib/i18n';
  import {
    listTracksByDid,
    getMyDid,
    deleteAllTracks,
    getR4Profile,
  } from '$lib/services/r4-service';
  import { withDpopRetry } from '$lib/utils/atproto-client';
  import { AtUri } from '@atproto/api';

  let isExporting = $state(false);
  let isDeleting = $state(false);
  let showDeleteDialog = $state(false);
  let tracksToDelete = $state<any[]>([]);
  let isCountingTracks = $state(false);
  let deleteProgress = $state<{ current: number; total: number } | null>(null);
  let deleteErrors = $state<string[]>([]);
  let permissionWorking = $state(false);
  let permissionError = $state('');

  const t = (key, vars = {}) => translate($locale, key, vars);

  async function managePermissions() {
    try {
      permissionWorking = true;
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
      permissionWorking = false;
    }
  }

  let signingOut = $state(false);

  async function signOut() {
    try {
      signingOut = true;
      await bskyOAuth.signOut();
      session.refresh();
      goto(resolve('/'));
    } catch (e) {
      console.error(e);
    } finally {
      signingOut = false;
    }
  }

  async function handleExport() {
    isExporting = true;
    try {
      const myDid = await getMyDid();

      // Fetch all tracks
      let allTracks = [];
      let cursor = undefined;
      do {
        const result = await listTracksByDid(myDid, { cursor, limit: 100 });
        allTracks.push(...result.tracks);
        cursor = result.cursor;
      } while (cursor);

      // Fetch profile
      let profile = null;
      try {
        profile = await getR4Profile(myDid);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }

      // Format backup similar to radio4000 format
      const backup = {
        version: 'r4atproto.v20251122',
        exported: new Date().toISOString(),
        channel: {
          did: myDid,
          handle: $session.handle,
          ...(profile && {
            mode: profile.mode,
            lightBackground: profile.lightBackground,
            lightForeground: profile.lightForeground,
            lightAccent: profile.lightAccent,
            darkBackground: profile.darkBackground,
            darkForeground: profile.darkForeground,
            darkAccent: profile.darkAccent,
          }),
        },
        tracks: allTracks.map(track => ({
          url: track.url,
          title: track.title,
          body: track.description || '',
          discogsUrl: track.discogsUrl || track.discogs_url,
          created: track.createdAt || track.created_at,
          updated: track.updatedAt || track.updated_at,
          uri: track.uri,
          rkey: track.rkey,
        })),
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `r4atproto-backup-${$session.handle}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(t('settings.exportTracksSuccess', { count: allTracks.length }));
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      isExporting = false;
    }
  }

  async function openDeleteDialog() {
    // Open dialog immediately
    showDeleteDialog = true;
    isCountingTracks = true;
    tracksToDelete = [];
    deleteErrors = [];

    try {
      const agent = bskyOAuth.agent;
      if (!agent) throw new Error('Not authenticated');

      const myDid = agent.accountDid!;
      let allTracks = [];
      let cursor = undefined;

      // Fetch ALL records directly from repo (no filtering)
      do {
        const result = await agent.com.atproto.repo.listRecords({
          repo: myDid,
          collection: 'com.radio4000.track',
          limit: 100,
          cursor,
        });

        const records = (result.data?.records || []).map((r: any) => ({
          uri: r.uri,
          cid: r.cid,
          rkey: r.uri?.split('/').pop(),
          title: r.value?.title || 'Untitled',
        }));

        allTracks.push(...records);
        cursor = result.data?.cursor;
      } while (cursor);

      tracksToDelete = allTracks;
    } catch (err) {
      console.error('Failed to load tracks:', err);
      deleteErrors = [`Failed to load tracks: ${(err as Error).message}`];
    } finally {
      isCountingTracks = false;
    }
  }

  async function handleDelete() {
    isDeleting = true;
    deleteProgress = null;
    deleteErrors = [];

    try {
      const agent = bskyOAuth.agent;
      if (!agent) throw new Error('Not authenticated');

      const myDid = agent.accountDid!;
      const total = tracksToDelete.length;
      let deleted = 0;

      // Process in batches of 200
      const BATCH_SIZE = 200;

      for (let i = 0; i < tracksToDelete.length; i += BATCH_SIZE) {
        const batch = tracksToDelete.slice(i, i + BATCH_SIZE);

        try {
          // Build delete operations
          const writes = batch.map(track => {
            const uri = new AtUri(track.uri);
            return {
              $type: 'com.atproto.repo.applyWrites#delete',
              collection: uri.collection,
              rkey: uri.rkey,
            };
          });

          // Execute batch delete with DPoP retry handling
          await withDpopRetry(() => agent.com.atproto.repo.applyWrites({
            repo: myDid,
            writes,
          }));

          deleted += batch.length;
          deleteProgress = { current: Math.min(i + BATCH_SIZE, total), total };

          // Delay between batches
          if (i + BATCH_SIZE < tracksToDelete.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          const errorMsg = `Failed to delete batch: ${(err as Error).message}`;
          console.error(errorMsg);
          deleteErrors = [...deleteErrors, errorMsg];
        }
      }

      showDeleteDialog = false;
      alert(t('settings.deleteTracksSuccess', { count: deleted }));
    } catch (err) {
      console.error('Delete failed:', err);
      deleteErrors = [...deleteErrors, `Delete failed: ${(err as Error).message}`];
    } finally {
      isDeleting = false;
      deleteProgress = null;
    }
  }
</script>

{#if $session?.did}
  <div class="settings-stack">
    <Card>
      <CardHeader>
        <CardTitle class="card-title-icon">
          <LogOut class="icon" />
          {t('settings.signOutTitle')}
        </CardTitle>
        <CardDescription>
          {t('settings.signOutDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onclick={signOut} disabled={signingOut} variant="destructive" class="full-width">
          {#if signingOut}
            <Loader2 class="icon-sm spin" />
            {t('settings.signOutWorking')}
          {:else}
            <LogOut class="icon-sm" />
            {t('settings.signOutButton')}
          {/if}
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{t('settings.accountTitle')}</CardTitle>
        <CardDescription>{t('settings.accountDescription')}</CardDescription>
      </CardHeader>
      <CardContent class="content-stack">
        <div class="field-group">
          <Label>{t('settings.handleLabel')}</Label>
          <div class="mono-box">
            @{$session.handle || '...'}
          </div>
        </div>
        <div class="field-group">
          <Label>{t('settings.didLabel')}</Label>
          <div class="mono-box break-all">
            {$session.did}
          </div>
        </div>
      </CardContent>
    </Card>

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
        <Button onclick={managePermissions} disabled={permissionWorking} variant="outline" class="full-width">
          {#if permissionWorking}
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

    <Card>
      <CardHeader>
        <CardTitle>{t('settings.accountActionsTitle')}</CardTitle>
        <CardDescription>{t('settings.accountActionsDescription')}</CardDescription>
      </CardHeader>
      <CardContent class="content-stack-sm">
        <Button onclick={handleExport} disabled={isExporting} variant="outline" class="full-width">
          {#if isExporting}
            <Loader2 class="icon-sm spin" />
            {t('settings.exportTracksWorking')}
          {:else}
            <Download class="icon-sm" />
            {t('settings.exportTracksButton')}
          {/if}
        </Button>

        <Button onclick={openDeleteDialog} disabled={isDeleting} variant="outline" class="full-width">
          <Trash2 class="icon-sm" />
          {t('settings.deleteTracksButton')}
        </Button>
      </CardContent>
    </Card>
  </div>

  <!-- Delete Confirmation Dialog -->
  <Dialog bind:open={showDeleteDialog}>
    <DialogContent class="dialog-wide">
      <DialogHeader>
        <DialogTitle class="card-title-icon">
          <AlertCircle class="icon destructive" />
          {t('settings.deleteTracksConfirmTitle')}
        </DialogTitle>
        <DialogDescription>
          {#if isCountingTracks}
            <span class="loading-inline">
              <Loader2 class="icon-sm spin" />
              Loading tracks...
            </span>
          {:else}
            {t('settings.deleteTracksConfirmDescription', { count: tracksToDelete.length })}
          {/if}
        </DialogDescription>
      </DialogHeader>

      {#if deleteErrors.length > 0}
        <div class="field-group">
          <h4 class="error-title">Errors ({deleteErrors.length}):</h4>
          <div class="error-list">
            {#each deleteErrors as error}
              <div class="error-item">{error}</div>
            {/each}
          </div>
        </div>
      {/if}

      <DialogFooter>
        <Button variant="outline" onclick={() => showDeleteDialog = false} disabled={isDeleting || isCountingTracks}>
          Cancel
        </Button>
        <Button variant="destructive" onclick={handleDelete} disabled={isDeleting || isCountingTracks || tracksToDelete.length === 0}>
          {#if isDeleting}
            <Loader2 class="icon-sm spin" />
            {#if deleteProgress}
              Deleting ({deleteProgress.current}/{deleteProgress.total})
            {:else}
              {t('settings.deleteTracksWorking')}
            {/if}
          {:else}
            {t('settings.deleteTracksConfirmButton')}
          {/if}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
{:else}
  <SignInForm variant="settings" />
{/if}

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

  :global(.content-stack) {
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
  }

  :global(.content-stack-sm) {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }

  .mono-box {
    padding: var(--size-2) var(--size-3);
    background: var(--muted);
    border-radius: var(--radius-2);
    font-family: var(--font-mono);
  }

  .break-all {
    word-break: break-all;
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

  :global(.dialog-wide) {
    max-width: 42rem;
    max-height: 80vh;
    overflow-y: auto;
  }

  .loading-inline {
    display: flex;
    align-items: center;
    gap: var(--size-2);
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

  .icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .icon.destructive {
    color: var(--destructive);
  }

  .icon-sm {
    width: 1rem;
    height: 1rem;
  }

  :global(.spin) {
    animation: var(--animation-spin);
  }
</style>
