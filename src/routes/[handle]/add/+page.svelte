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
  import { page } from '$app/stores';

  let savedUri = $state('');
  const savedAt = $derived(savedUri ? parseAtUri(savedUri) : null);
  const t = (key, vars = {}) => translate($locale, key, vars);
  const userHandle = $derived($session?.handle || '');
  const pageHandle = $derived($page.params.handle?.replace(/^@/, '') || '');

  function viewTrack() {
    if (!savedAt || !pageHandle) return;
    goto(`/@${encodeURIComponent(pageHandle)}/${encodeURIComponent(savedAt.rkey)}`);
  }

  async function onCreate({ url, title, description, discogs_url }) {
    const res = await createTrack({ url, title, description, discogs_url });
    savedUri = res?.data?.uri || res?.uri || '';
    return res;
  }
</script>

<div class="container max-w-2xl py-6">
  <Card>
    <CardHeader>
      <CardTitle>{t('add.title')}</CardTitle>
      <CardDescription>
        {t('add.description')}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <TrackForm submitLabel={t('forms.publish')} onSubmit={onCreate} />

      {#if savedAt}
        <div class="mt-6">
          <StateCard
            icon={CheckCircle2}
            title={t('add.successTitle')}
            description={t('add.successDescription')}
          >
            {#snippet actions()}
            <Button
              variant="outline"
              onclick={viewTrack}
            >
              {t('add.viewTrack')}
            </Button>
          {/snippet}
          </StateCard>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
