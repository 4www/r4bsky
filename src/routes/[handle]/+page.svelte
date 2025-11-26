<script lang="ts">
  import { useLiveQuery } from '@tanstack/svelte-db';
  import { tracksCollection, loadTracksForDid, loadMoreTracksForDid, getPaginationState, removeTrack } from '$lib/stores/tracks-db';
  import { getContext, tick, onMount } from 'svelte';
  import TrackListItem from '$lib/components/TrackListItem.svelte';
  import DiscogsResource from '$lib/components/DiscogsResource.svelte';
  import TrackEditDialogContent from '$lib/components/TrackEditDialogContent.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Loader2, AlertCircle, RefreshCw } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { locale, translate } from '$lib/i18n';
  import { createVirtualizer } from '@tanstack/svelte-virtual';
  import { browser } from '$app/environment';

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
  let listContainer = $state<HTMLElement | null>(null);
  let listHeight = $state(600);

  // Use live query to get tracks for this DID
  const tracksQuery = useLiveQuery(
    (q) => q.from({ tracks: tracksCollection }),
    []
  );

  // Derive items from query, filtering by DID and sorting by created_at
  // TODO: Use indexed queries when TanStack DB API supports it
  const items = $derived.by(() => {
    if (!did) return [];
    const allTracks = tracksQuery.data || [];
    const filtered = allTracks.filter(track => track.authorDid === did);
    // Sort by created_at descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  });

  // Group tracks by Year Month based on created_at
  const groupedTracks = $derived.by(() => {
    const groups = new Map<string, { tracks: typeof items; year: number; month: number }>();

    items.forEach(track => {
      const createdAt = track.created_at;
      if (!createdAt) return;

      try {
        const date = new Date(createdAt);
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
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Newest first within group
        }),
        year: data.year,
        month: data.month,
        // Sort key: combine year and month for proper ordering
        sortKey: data.year * 100 + data.month
      }))
      .sort((a, b) => b.sortKey - a.sortKey); // Sort groups by year-month (newest first)
  });

  // Flatten grouped tracks for virtualization (headers + items)
  const virtualData = $derived.by(() => {
    const flat: Array<{ kind: 'header'; key: string; group: typeof groupedTracks[number] } | { kind: 'track'; track: typeof items[number] }> = [];
    const sticky: number[] = [];

    groupedTracks.forEach(group => {
      sticky.push(flat.length);
      flat.push({ kind: 'header', key: group.key, group });
      group.tracks.forEach(track => {
        flat.push({ kind: 'track', track });
      });
    });

    return { flat, sticky };
  });

  const paginationState = $derived(did ? getPaginationState(did) : { cursor: undefined, hasMore: false, loading: false });
  const cursor = $derived(paginationState.cursor);
  const hasMore = $derived(paginationState.hasMore);

  const selectedTrack = $derived(items.find(t => t.uri === selectedTrackUri) || null);
  const editingTrack = $derived(items.find(t => t.uri === editingTrackUri) || null);
  const editingRkey = $derived(editingTrackUri ? editingTrackUri.split('/').pop() : '');
  const editable = $derived((($session?.did && did && $session.did === did) ? true : false));

  // Create virtualizer - returns a Svelte store
  const virtualizerStore = createVirtualizer({
    count: 0,
    getScrollElement: () => listContainer,
    estimateSize: (index) => {
      const item = virtualData.flat[index];
      if (item?.kind === 'header') return 52;
      // Estimate based on if item has discogs and is selected
      const track = item?.track;
      const isSelected = track?.uri === selectedTrackUri;
      const hasDiscogs = track?.discogs_url || track?.discogsUrl;
      if (isSelected && hasDiscogs) return 320;
      // Default estimate - will be measured dynamically
      return 80;
    },
    measureElement: (element) => {
      // Measure the actual rendered height
      return element.getBoundingClientRect().height;
    },
    overscan: 4,
    getItemKey: (index) => {
      const item = virtualData.flat[index];
      return item?.kind === 'header' ? `header-${item.key}` : item?.track?.uri || index;
    },
  });

  // Update virtualizer when data changes
  $effect(() => {
    $virtualizerStore.setOptions({
      count: virtualData.flat.length,
    });
  });

  // Action to measure element height
  function measureElement(node: HTMLElement) {
    $virtualizerStore.measureElement(node);
    return {
      destroy() {}
    };
  }

  async function refreshTracks() {
    if (!did) return;
    loading = true;
    status = '';

    try {
      // Check for new tracks without resetting the list
      // This fetches the latest page and merges any new tracks into the collection
      await loadTracksForDid(did, { forceRefresh: true, limit: 50 });
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

  // Recompute sizes when selection changes (for variable heights with expanded discogs view)
  $effect(() => {
    if (selectedTrackUri !== null) {
      setTimeout(() => {
        $virtualizerStore.measure();
      }, 0);
    }
  });

  // Calculate height based on viewport - exclude header, nav, and margins
  onMount(() => {
    if (!browser) return;

    const updateHeight = () => {
      // Account for: navbar (~60px), profile header (~180px), track count bar (~40px), gaps/padding (~60px)
      const reservedSpace = 340;
      listHeight = Math.max(400, window.innerHeight - reservedSpace);

      // Recompute item sizes when viewport changes (important for mobile orientation changes)
      setTimeout(() => {
        $virtualizerStore.measure();
      }, 0);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  });

  // Handle infinite scroll
  let loadingMore = $state(false);

  $effect(() => {
    if (!hasMore || loadingMore || paginationState.loading || loadingAll || !listContainer) return;

    const items = $virtualizerStore.getVirtualItems();
    if (items.length === 0) return;

    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    // Load more when last visible item is close to the end
    if (lastItem.index >= virtualData.flat.length - 5) {
      loadingMore = true;
      more().finally(() => {
        loadingMore = false;
      });
    }
  });
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
  <div class="flex flex-col gap-3 flex-1 min-h-0">
    <div class="flex items-center justify-between gap-3 px-2">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-foreground">
          {items.length} {items.length === 1 ? t('profile.track') : t('profile.tracks')}
        </span>
        {#if hasMore}
          <span class="text-xs text-muted-foreground">({t('profile.loaded')})</span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onclick={refreshTracks}
          disabled={loading}
          title={t('profile.refresh') || 'Refresh'}
          class="gap-2"
        >
          <RefreshCw class={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {#if loading}
            <span class="text-xs">{t('profile.refreshing')}</span>
          {/if}
        </Button>
        {#if hasMore}
          <Button
            variant="outline"
            size="sm"
            onclick={loadAll}
            disabled={loadingAll || paginationState.loading}
            class="gap-2"
          >
            {#if loadingAll}
              <Loader2 class="h-4 w-4 animate-spin" />
              <span>{loadProgress.current} {t('profile.loaded')}</span>
            {:else}
              {t('profile.loadAllTracks')}
            {/if}
          </Button>
        {/if}
      </div>
    </div>
    <div class="rounded-xl border border-foreground bg-card/70 overflow-auto" role="region" aria-label="Track list grouped by date" bind:this={listContainer} style="height: {listHeight}px;">
      <div style="height: {$virtualizerStore.getTotalSize()}px; width: 100%; position: relative;">
        {#each $virtualizerStore.getVirtualItems() as virtualItem (virtualItem.key)}
          {@const itemIndex = virtualItem.index}
          {@const style = `position: absolute; top: 0; left: 0; width: 100%; transform: translateY(${virtualItem.start}px);`}
          <div
            {style}
            class="px-0.5"
            data-index={itemIndex}
            use:measureElement
          >
          {#if virtualData.flat[itemIndex]?.kind === 'header'}
            {@const group = virtualData.flat[itemIndex].group}
            <div class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 py-2 border-b border-border">
              <h3 class="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                {group.key}
                <span class="ml-2 text-xs font-normal text-muted-foreground">
                  ({group.tracks.length} {group.tracks.length === 1 ? t('profile.track') : t('profile.tracks')})
                </span>
              </h3>
            </div>
          {:else}
            {@const item = virtualData.flat[itemIndex]?.track}
            {@const globalIdx = items.findIndex(t => t.uri === item?.uri)}
            {@const isSelected = item?.uri === selectedTrackUri}
            {@const discogsUrl = item?.discogs_url || ''}
            {#if item}
              {#if isSelected && discogsUrl}
                <div bind:this={selectedTrackRef} class="border-b border-border last:border-b-0 bg-background">
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
                <div class="border-b border-border last:border-b-0 bg-background">
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
                </div>
              {/if}
            {/if}
          {/if}
          </div>
        {/each}
        {#if hasMore && paginationState.loading}
          <div class="flex items-center justify-center py-4" style="position: absolute; bottom: 0; left: 0; width: 100%;">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 class="h-4 w-4 animate-spin" />
              {t('profile.loading')}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
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
