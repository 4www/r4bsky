<script lang="ts">
  import { useLiveQuery } from '@tanstack/svelte-db';
  import { tracksCollection, loadTracksForDid, loadMoreTracksForDid, getPaginationState, removeTrack } from '$lib/stores/tracks-db';
  import { getContext, tick } from 'svelte';
  import TrackListItem from '$lib/components/TrackListItem.svelte';
  import DiscogsResource from '$lib/components/DiscogsResource.svelte';
  import TrackEditDialogContent from '$lib/components/TrackEditDialogContent.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
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

  let status = $state('');
  let loading = $state(false);
  let selectedTrackUri = $state<string | null>(null);
  let selectedTrackRef = $state<HTMLElement | null>(null);
  let editingTrackUri = $state<string | null>(null);
  let lastLoadedDid = $state<string>('');
  const context = $derived(did ? { type: 'author', key: did, handle } : { type: 'author', key: handle || '' });
  const t = (key, vars = {}) => translate($locale, key, vars);

  // Use live query to get tracks for this DID
  const tracksQuery = useLiveQuery(
    (q) => q.from({ tracks: tracksCollection }),
    []
  );

  // Derive items from query, filtering by DID
  const items = $derived.by(() => {
    if (!did) return [];
    const allTracks = tracksQuery.data || [];
    return allTracks.filter(track => track.authorDid === did);
  });
  const paginationState = $derived(did ? getPaginationState(did) : { cursor: undefined, hasMore: false, loading: false });
  const cursor = $derived(paginationState.cursor);
  const hasMore = $derived(paginationState.hasMore);

  const selectedTrack = $derived(items.find(t => t.uri === selectedTrackUri) || null);
  const editingTrack = $derived(items.find(t => t.uri === editingTrackUri) || null);
  const editingRkey = $derived(editingTrackUri ? editingTrackUri.split('/').pop() : '');
  const editable = $derived((($session?.did && did && $session.did === did) ? true : false));

  async function refreshTracks() {
    if (!did) return;
    loading = true;
    status = '';

    try {
      // Explicitly reset and reload from API
      await loadTracksForDid(did, { reset: true });
    } catch (err) {
      status = (err as Error)?.message || String(err);
    } finally {
      loading = false;
    }
  }

  async function loadTracks(targetDid: string) {
    // Check if we already have tracks for this DID
    const existingTracks = items.length;

    // If we already have tracks, don't reload (preserves pagination state)
    if (existingTracks > 0) {
      return;
    }

    loading = true;
    status = '';

    try {
      // Load first page only (no reset - preserves any existing tracks)
      await loadTracksForDid(targetDid);
    } catch (err) {
      status = (err as Error)?.message || String(err);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    // Only load tracks when did actually changes, not on every reactive update
    if (did && did !== lastLoadedDid) {
      lastLoadedDid = did;
      loadTracks(did);
    }
  });

  // Scroll to selected track
  $effect(() => {
    if (selectedTrack && selectedTrackRef) {
      tick().then(() => {
        selectedTrackRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  });

  function selectTrack(trackUri: string) {
    const track = items.find(t => t.uri === trackUri);
    if (!track) return;

    selectedTrackUri = selectedTrackUri === trackUri ? null : trackUri;
  }

  function openEditDialog(trackUri: string) {
    editingTrackUri = trackUri;
  }

  function closeEditDialog() {
    editingTrackUri = null;
  }

  function onTrackSaved() {
    closeEditDialog();
    // Refresh tracks to get updated data
    if (did) {
      refreshTracks();
    }
  }

  async function handleTrackRemoved(event) {
    const { uri } = event.detail;
    try {
      await removeTrack(uri);
      // If the removed track was selected, clear selection
      if (selectedTrackUri === uri) {
        selectedTrackUri = null;
      }
    } catch (err) {
      status = (err as Error)?.message || String(err);
    }
  }

  async function more() {
    if (!cursor || !did) return;
    try {
      await loadMoreTracksForDid(did);
    } catch (err) {
      status = (err as Error)?.message || String(err);
    }
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
  <div class="flex items-center justify-center min-h-[50vh]">
    <StateCard
      icon={Loader2}
      loading={true}
      title={t('profile.loadingTitle')}
      description={t('profile.loadingDescription')}
    />
  </div>
{:else if items.length}
  <div class="rounded-xl border border-foreground divide-y overflow-visible">
    {#each items as item, idx (item.uri || idx)}
      {@const isSelected = item.uri === selectedTrackUri}
      {@const discogsUrl = item?.discogsUrl || item?.discogs_url || ''}
      {#if isSelected && discogsUrl}
        <div bind:this={selectedTrackRef}>
          <TrackListItem
            {item}
            index={idx}
            items={items}
            {context}
            {editable}
            isDetailView={true}
            flat={true}
            onSelectTrack={selectTrack}
            onEditTrack={openEditDialog}
            onremove={handleTrackRemoved}
            showAuthor={false}
          >
            {#snippet expandedContent()}
              <DiscogsResource url={discogsUrl} {handle} />
            {/snippet}
          </TrackListItem>
        </div>
      {:else}
        <TrackListItem
          {item}
          index={idx}
          items={items}
          {context}
          {editable}
          flat={true}
          onSelectTrack={selectTrack}
          onEditTrack={openEditDialog}
          onremove={handleTrackRemoved}
          showAuthor={false}
        />
      {/if}
    {/each}
  </div>
  {#if hasMore}
    <div class="mt-4 text-center">
      <Button variant="outline" onclick={more} disabled={paginationState.loading}>
        {paginationState.loading ? t('profile.loading') : t('profile.loadMore')}
      </Button>
    </div>
  {/if}
{:else}
  <StateCard
    icon={AlertCircle}
    title={t('profile.noTracksTitle')}
    description={t('profile.noTracksDescription')}
  />
{/if}

{#if editingTrackUri && editingRkey}
  <Dialog title={t('editTrack.title')} onClose={closeEditDialog}>
    <TrackEditDialogContent
      {handle}
      repo={did}
      rkey={editingRkey}
      onsaved={onTrackSaved}
    />
  </Dialog>
{/if}
