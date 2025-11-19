<script lang="ts">
  import { listTracksByDid } from '$lib/services/r4-service';
  import { getContext } from 'svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Loader2, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { locale, translate } from '$lib/i18n';

  const { data } = $props();
  const handle = $derived(data?.handle ? data.handle.replace(/^@/, '') : '');

  // Get profile and did from layout context
  const profileContext = getContext('profile');
  const profile = $derived(profileContext?.profile);
  const did = $derived(profileContext?.did);

  let items = $state([]);
  let cursor = $state(undefined);
  let status = $state('');
  let loading = $state(false);
  const context = $derived(did ? { type: 'author', key: did, handle } : { type: 'author', key: handle || '' });
  let loadRequestId = 0;
  const t = (key, vars = {}) => translate($locale, key, vars);

  function refreshTracks() {
    if (did) {
      loadTracks(did);
    }
  }

  async function loadTracks(targetDid: string) {
    const requestId = ++loadRequestId;
    loading = true;
    status = '';
    items = [];
    cursor = undefined;

    (async () => {
      try {
        const tracksData = await listTracksByDid(targetDid);
        if (requestId !== loadRequestId) return;
        items = tracksData.tracks;
        cursor = tracksData.cursor;
      } catch (err) {
        if (requestId === loadRequestId) status = (err as Error)?.message || String(err);
      } finally {
        if (requestId === loadRequestId) loading = false;
      }
    })();
  }

  $effect(() => {
    if (did) {
      loadTracks(did);
    }
  });

  async function more() {
    if (!cursor || !did) return;
    const { tracks, cursor: c } = await listTracksByDid(did, { cursor });
    items = [...items, ...tracks];
    cursor = c;
  }
</script>

{#if status}
  <StateCard
    icon={AlertCircle}
    title={t('profile.errorTitle')}
    description={status}
    class="mb-6"
  >
    {#snippet actions()}
      <Button variant="outline" onclick={refreshTracks}>
        {t('buttons.tryAgain')}
      </Button>
    {/snippet}
  </StateCard>
{/if}

{#if loading}
  <StateCard
    icon={Loader2}
    loading={true}
    title={t('profile.loadingTitle')}
    description={t('profile.loadingDescription')}
  />
{:else if items.length}
  <TrackList
    tracks={items}
    {context}
    editable={($session?.did && did && $session.did === did) || false}
    on:remove={(e) => { items = items.filter((t) => t.uri !== e.detail.uri); }}
  />
  {#if cursor && items.length >= 30}
    <div class="mt-4 text-center">
      <Button variant="outline" onclick={more}>
        {t('profile.loadMore')}
      </Button>
    </div>
  {/if}
{/if}
