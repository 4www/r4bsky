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
  let loadingAll = $state(false);
  let loadProgress = $state({ current: 0, total: 0 });
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

  // Derive items from query, filtering by DID and sorting by createdAt
  // TODO: Use indexed queries when TanStack DB API supports it
  const items = $derived.by(() => {
    if (!did) return [];
    const allTracks = tracksQuery.data || [];
    const filtered = allTracks.filter(track => track.authorDid === did);
    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  });

  // Group tracks by Year Month based on createdAt
  const groupedTracks = $derived.by(() => {
    const groups = new Map<string, { tracks: typeof items; year: number; month: number }>();

    items.forEach(track => {
      if (!track.createdAt) return;

      try {
        const date = new Date(track.createdAt);
        if (isNaN(date.getTime())) return;

        const year = date.getFullYear();
        const monthNum = date.getMonth(); // 0-11
        // Use current locale for month name
        const monthName = date.toLocaleDateString($locale, { month: 'long' });
        const key = `${year} ${monthName}`;

        if (!groups.has(key)) {
          groups.set(key, { tracks: [], year, month: monthNum });
        }
        groups.get(key)!.tracks.push(track);
      } catch (e) {
        // Invalid date, skip grouping
      }
    });

    // Sort groups by year and month (newest first), then sort tracks within each group by createdAt
    return Array.from(groups.entries())
      .map(([key, data]) => ({
        key,
        tracks: data.tracks.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA; // Newest first within group
        }),
        year: data.year,
        month: data.month,
        // Sort key: combine year and month for proper ordering
        sortKey: data.year * 100 + data.month
      }))
      .sort((a, b) => b.sortKey - a.sortKey); // Sort groups by year-month (newest first)
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

  async function loadAll() {
    if (!did || loadingAll) return;

    loadingAll = true;
    status = '';

    try {
      let hasMore = true;
      let totalLoaded = items.length;

      while (hasMore) {
        const state = getPaginationState(did);
        if (!state.cursor) {
          hasMore = false;
          break;
        }

        await loadMoreTracksForDid(did);

        // Update progress
        totalLoaded = items.length;
        loadProgress = { current: totalLoaded, total: totalLoaded };

        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      loadProgress = { current: 0, total: 0 };
    } catch (err) {
      status = (err as Error)?.message || String(err);
      loadProgress = { current: 0, total: 0 };
    } finally {
      loadingAll = false;
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
  <div class="space-y-6">
    {#each groupedTracks as group (group.key)}
      <div class="space-y-1">
        <!-- Group Header -->
        <div class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 py-1">
          <h3 class="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
            {group.key}
            <span class="ml-2 text-xs font-normal text-muted-foreground">
              ({group.tracks.length} {group.tracks.length === 1 ? t('profile.track') : t('profile.tracks')})
            </span>
          </h3>
        </div>

        <!-- Tracks in Group -->
        <div class="rounded-xl border border-foreground divide-y overflow-visible">
          {#each group.tracks as item (item.uri)}
            {@const globalIdx = items.findIndex(t => t.uri === item.uri)}
            {@const isSelected = item.uri === selectedTrackUri}
            {@const discogsUrl = item?.discogs_url || ''}
            {#if isSelected && discogsUrl}
              <div bind:this={selectedTrackRef}>
                <TrackListItem
                  {item}
                  index={globalIdx}
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
                index={globalIdx}
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
      </div>
    {/each}
  </div>
  {#if hasMore}
    <div class="mt-4 flex flex-col gap-2 items-center">
      <div class="flex gap-2">
        <Button variant="outline" onclick={more} disabled={paginationState.loading || loadingAll}>
          {paginationState.loading ? t('profile.loading') : t('profile.loadMore')}
        </Button>
        <Button variant="default" onclick={loadAll} disabled={loadingAll || paginationState.loading}>
          {loadingAll ? `Loading all... (${loadProgress.current} tracks)` : 'Load All Tracks'}
        </Button>
      </div>
      {#if loadingAll}
        <p class="text-xs text-muted-foreground">
          Loading all remaining tracks... {loadProgress.current} loaded so far
        </p>
      {/if}
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
