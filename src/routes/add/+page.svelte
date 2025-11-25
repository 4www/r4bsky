<script lang="ts">
  import { createTrack } from '$lib/services/r4-service';
  import TrackForm from '$lib/components/TrackForm.svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { parseAtUri } from '$lib/services/track-uri';
  import { CheckCircle2 } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { Button } from '$lib/components/ui/button';
  import { locale, translate } from '$lib/i18n';
  import { session } from '$lib/state/session';
  import { goto } from '$app/navigation';

  let savedUri = $state('');
  const savedAt = $derived(savedUri ? parseAtUri(savedUri) : null);
  const t = (key, vars = {}) => translate($locale, key, vars);
  const userHandle = $derived($session?.handle || '');

  function viewTrack() {
    if (!savedAt || !userHandle) return;
    goto(`/@${encodeURIComponent(userHandle)}/${encodeURIComponent(savedAt.rkey)}`);
  }

  async function onCreate({ url, title, description, discogs_url }) {
    const res = await createTrack({ url, title, description, discogs_url });
    savedUri = res?.data?.uri || res?.uri || '';
    return res;
  }
</script>

<div class="add-page">
  <Card>
    <CardHeader>
      <CardTitle>{t('add.title')}</CardTitle>
    </CardHeader>
    <CardContent>
      <TrackForm submitLabel={t('forms.publish')} onSubmit={onCreate} />

      {#if savedAt}
        <div class="success-section">
          <StateCard
            icon={CheckCircle2}
            title={t('add.successTitle')}
            description={t('add.successDescription')}
          >
            {#snippet actions()}
            <Button variant="outline" onclick={viewTrack}>
              {t('add.viewTrack')}
            </Button>
          {/snippet}
          </StateCard>
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
    margin-top: var(--size-fluid-3);
  }
</style>
