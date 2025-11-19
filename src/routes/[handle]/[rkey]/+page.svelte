<script lang="ts">
  import { onMount } from 'svelte';
  import { getTrackByUri, resolveHandle, listTracksByDid } from '$lib/services/r4-service';
  import TrackListItem from '$lib/components/TrackListItem.svelte';
  import DiscogsResource from '$lib/components/DiscogsResource.svelte';
  import { session } from '$lib/state/session';
  import { Loader2, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { Button } from '$lib/components/ui/button';
  import { locale, translate } from '$lib/i18n';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  let { data } = $props();
  const _handle = $derived(data?.handle || '');
  const handle = $derived(_handle ? _handle.replace(/^@/, '') : '');
  const rkey = $derived(data?.rkey || '');

  let item = $state(null);
  let did = $state('');
  let allTracks = $state([]);
  let status = $state('');
  let loading = $state(true);
  let displayHandle = $state('');
  let returnTo = $state('');
  const context = $derived({ type: 'author', key: did, handle: displayHandle || undefined });
  const trackIndex = $derived(allTracks.findIndex(t => t.uri === item?.uri));
  const editable = $derived((($session?.did && did && $session.did === did) ? true : false));
  const discogsUrl = $derived(item?.discogsUrl || item?.discogs_url || '');
  let loadRequestId = 0;
  const t = (key, vars = {}) => translate($locale, key, vars);

  function refreshTrack() {
    loadTrack(handle, rkey);
  }

  async function loadTrack(currentHandle: string, currentRkey: string) {
    const requestId = ++loadRequestId;
    loading = true;
    status = '';
    item = null;
    allTracks = [];

    try {
      if (!currentHandle || !currentRkey) {
        if (requestId === loadRequestId) status = t('trackDetail.errorTitle');
        return;
      }

      const resolvedDid = await resolveHandle(currentHandle);
      if (requestId !== loadRequestId) return;
      did = resolvedDid;
      displayHandle = currentHandle;

      const [trackData, tracksData] = await Promise.all([
        getTrackByUri(`at://${resolvedDid}/com.radio4000.track/${currentRkey}`),
        listTracksByDid(resolvedDid, { limit: 100 })
      ]);

      if (requestId === loadRequestId) {
        item = { ...trackData };
        allTracks = tracksData.tracks;
      }
    } catch (e) {
      if (requestId === loadRequestId) status = (e as Error)?.message || t('trackDetail.errorTitle');
    } finally {
      if (requestId === loadRequestId) loading = false;
    }
  }

  onMount(() => {
    returnTo = window.history.state?.returnTo || '';
  });

  $effect(() => {
    if (handle && rkey) {
      loadTrack(handle, rkey);
    }
  });

  function closeModal() {
    const fallbackHandle = displayHandle ? `/@${encodeURIComponent(displayHandle)}` : '/';
    const target = returnTo || fallbackHandle;
    goto(resolve(target), { replaceState: true, noScroll: true, keepFocus: true }).catch(() => {
      window.history.back();
    });
  }
</script>

<Dialog onClose={closeModal}>
  <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
    {#if loading}
      <StateCard
        icon={Loader2}
        loading={true}
        title={t('trackDetail.loadingTitle')}
        description={t('trackDetail.loadingDescription')}
      />
    {:else if status}
      <StateCard
        icon={AlertCircle}
        title={t('trackDetail.errorTitle')}
        description={status}
      >
        {#snippet actions()}
          <Button variant="outline" onclick={refreshTrack}>
            {t('buttons.tryAgain')}
          </Button>
        {/snippet}
      </StateCard>
    {:else if item}
      <TrackListItem
        item={item}
        index={trackIndex >= 0 ? trackIndex : 0}
        items={allTracks.length > 0 ? allTracks : [item]}
        {context}
        {editable}
      />

      {#if discogsUrl}
        <DiscogsResource url={discogsUrl} />
      {/if}
    {/if}
  </div>
</Dialog>
