<script lang="ts">
  import { createTrack, getTrackByUri } from '$lib/services/r4-service';
  import TrackForm from '$lib/components/TrackForm.svelte';
  import TrackListItem from '$lib/components/TrackListItem.svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { parseAtUri } from '$lib/services/track-uri';
  import { CheckCircle2 } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { Button } from '$lib/components/ui/button';
  import { locale, translate } from '$lib/i18n';
  import { session } from '$lib/state/session';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let savedUri = $state('');
  let savedTrack = $state(null);
  const savedAt = $derived(savedUri ? parseAtUri(savedUri) : null);
  const t = (key, vars = {}) => translate($locale, key, vars);
  const userHandle = $derived($session?.handle || '');
  const pageHandle = $derived($page.params.handle?.replace(/^@/, '') || '');

  function viewTrack() {
    if (!savedAt || !pageHandle) return;
    goto(`/@${encodeURIComponent(pageHandle)}/tracks/${encodeURIComponent(savedAt.rkey)}`);
  }

  async function onCreate({ url, title, description, discogs_url }) {
    const res = await createTrack({ url, title, description, discogs_url });
    savedUri = res?.data?.uri || res?.uri || '';
    if (savedUri) {
      // Fetch the full track data to display the card
      try {
        const trackData = await getTrackByUri(savedUri);
        savedTrack = trackData;
      } catch (e) {
        console.error('Failed to fetch created track:', e);
      }
    }
    return res;
  }
</script>

<div class="add-page">
  <Card>
    <CardHeader>
      <CardTitle>{t('add.title')}</CardTitle>
      <CardDescription>
        {t('add.description')}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <TrackForm submitLabel={t('forms.publish')} onSubmit={onCreate} />

      {#if savedTrack}
        <div class="success-section">
          <div class="success-message">
            <CheckCircle2 class="icon-sm" />
            <span>{t('add.successTitle')}</span>
          </div>
          <TrackListItem
            item={savedTrack}
            index={0}
            items={[savedTrack]}
            context={{ type: 'profile', key: savedAt?.repo || '', handle: pageHandle }}
            editable={true}
            showAuthor={false}
          />
        </div>
      {/if}
    </CardContent>
  </Card>
</div>

<style>
  .add-page {
    max-width: 42rem;
    margin-inline: auto;
    padding: var(--size-fluid-2);
  }

  .success-section {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
    margin-top: var(--size-fluid-2);
  }

  .success-message {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    color: var(--muted-foreground);
  }

  .icon-sm {
    width: 1rem;
    height: 1rem;
  }
</style>
