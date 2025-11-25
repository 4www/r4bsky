<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { player, toggle, next, prev, playIndex, toggleShuffle, shuffleCurrentPlaylist } from '$lib/player/store';
  import { useLiveQuery } from '@tanstack/svelte-db';
  import { tracksCollection, removeTrack } from '$lib/stores/tracks-db';
  import { parseTrackUrl, buildEmbedUrl } from '$lib/services/url-patterns';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Play, Pause, SkipForward, SkipBack, ExternalLink, Disc as DiscIcon, Shuffle, MoreVertical, Eye, Search } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';
  import Link from '$lib/components/Link.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { profilesCollection, loadProfile, getProfileFromCache } from '$lib/stores/profiles-db';
  import { buildViewHash, buildEditHash } from '$lib/services/track-uri';
  import { session } from '$lib/state/session';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import TrackListItemSimple from '$lib/components/TrackListItemSimple.svelte';
  let {
    class: classProp = '',
    visible: visibleProp = true,
    mobilePanelOpen = $bindable(false)
  } = $props();
  const extraClass = $derived(classProp);
  const visible = $derived(visibleProp);

  let state = $state({ context: null, customPlaylist: null, index: -1, playing: false, isShuffled: false });
  let current = $state(null);

  // Use live query to get tracks from centralized store when context is profile/author
  const tracksQuery = useLiveQuery(
    (q) => q.from({ tracks: tracksCollection }),
    []
  );

  // Use live query to get profiles from cache
  const profilesQuery = useLiveQuery(
    (q) => q.from({ profiles: profilesCollection }),
    []
  );

  // Derive the actual playlist based on context
  const playlist = $derived.by(() => {
    const ctx = state.context;
    if (!ctx) return [];

    // For profile/author contexts, merge customPlaylist with centralized store
    // This ensures we have tracks immediately, but can also get updates from the store
    if (ctx.type === 'profile' || ctx.type === 'author') {
      const allTracks = tracksQuery.data || [];
      const centralizedTracks = allTracks.filter(track => track.authorDid === ctx.key);

      // If shuffle is active and we have a customPlaylist, use it (it contains the shuffled order)
      // This allows shuffle to work even with centralized tracks
      if (state.isShuffled && state.customPlaylist && state.customPlaylist.length > 0) {
        return state.customPlaylist;
      }

      // Use centralized tracks if available and non-empty, otherwise fall back to customPlaylist
      if (centralizedTracks.length > 0) {
        return centralizedTracks;
      }
      return state.customPlaylist || [];
    }

    // For other contexts (discogs), use custom playlist
    return state.customPlaylist || [];
  });
  let iframeSrc = $state('');
  let iframeProvider = $state('');
  let ytPlayer = $state(null);
  let scWidget = $state(null);
  let vimeoPlayer = $state(null);
  let ytApiReady = $state(null);
  let scApiReady = $state(null);
  let vimeoApiReady = $state(null);
  const isBrowser = typeof window !== 'undefined';
  let ytPlayerReady = $state(false);
  let scWidgetReady = $state(false);
  let vimeoPlayerReady = $state(false);
  let playerIframe = $state<HTMLIFrameElement | null>(null);
  let playerAudio = $state<HTMLAudioElement | null>(null);
  let menuOpen = $state(false);
  let menuRef = $state<HTMLElement | null>(null);
  let triggerRef = $state<HTMLElement | null>(null);
  let trackMenuOpen = $state<number | null>(null);
  let searchQuery = $state('');

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  function toggleTrackMenu(idx: number) {
    trackMenuOpen = trackMenuOpen === idx ? null : idx;
  }

  function closeTrackMenu() {
    trackMenuOpen = null;
  }

  async function deleteTrack(uri: string) {
    try {
      await removeTrack(uri);
      closeTrackMenu();
      // For custom playlists, also remove from the playlist
      if (state.customPlaylist) {
        player.update(s => ({
          ...s,
          customPlaylist: s.customPlaylist ? s.customPlaylist.filter(t => t.uri !== uri) : null
        }));
      }
    } catch (err) {
      console.error('Failed to delete track:', err);
    }
  }

  function loadScriptOnce(src, check) {
    return new Promise((resolve, reject) => {
      try {
        if (check && check()) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = (e) => reject(new Error('Failed to load ' + src));
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
  }

  function ensureYouTubeAPI() {
    if (!ytApiReady) {
      ytApiReady = new Promise((resolve) => {
        const onReady = () => resolve();
        if (window.YT && window.YT.Player) return resolve();
        window.onYouTubeIframeAPIReady = onReady;
        loadScriptOnce('https://www.youtube.com/iframe_api', () => window.YT && window.YT.Player).then(() => {
          if (window.YT && window.YT.Player) resolve();
        }).catch(() => resolve());
      });
    }
    return ytApiReady;
  }

  function ensureSCAPI() {
    if (!scApiReady) {
      scApiReady = loadScriptOnce('https://w.soundcloud.com/player/api.js', () => window.SC && window.SC.Widget);
    }
    return scApiReady;
  }

  function ensureVimeoAPI() {
    if (!vimeoApiReady) {
      vimeoApiReady = loadScriptOnce('https://player.vimeo.com/api/player.js', () => window.Vimeo && window.Vimeo.Player);
    }
    return vimeoApiReady;
  }

  let lastIndex = $state(-1);
  let lastUrl = $state('');
  let lastProvider = $state('');
  let syncingWithIframe = $state(false);

  function cleanupProviders() {
    try { if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy(); } catch {}
    ytPlayer = null;
    ytPlayerReady = false;
    try { if (vimeoPlayer && vimeoPlayer.unload) vimeoPlayer.unload(); } catch {}
    vimeoPlayer = null;
    vimeoPlayerReady = false;
    scWidget = null;
    scWidgetReady = false;
    // Reset tracking variables to ensure iframe rebuilds on next track
    lastUrl = '';
    lastProvider = '';
  }

  function resetAudioElement(el?: HTMLAudioElement | null) {
    if (!el) return;
    try { el.pause(); } catch {}
    el.removeAttribute('src');
    try { el.load(); } catch {}
  }

  function clearIframeSource(el?: HTMLIFrameElement | null) {
    if (!el) return;
    try { el.contentWindow?.postMessage?.({ method: 'pause' }, '*'); } catch {}
    el.removeAttribute('src');
  }

  function setIframeSource(value: string) {
    iframeSrc = value;
  }

  function syncFileAudio(url: string, playing: boolean) {
    if (!playerAudio) return;
    if (playerAudio.src !== url) {
      playerAudio.src = url;
      try { playerAudio.load(); } catch {}
    }
    if (playing) playerAudio.play().catch(() => {});
    else playerAudio.pause();
  }

  const unsub = player.subscribe((s) => {
    state = s;

    // Compute current playlist directly (can't rely on derived in subscription)
    const ctx = s.context;
    let currentPlaylist = [];

    if (ctx) {
      if (ctx.type === 'profile' || ctx.type === 'author') {
        const allTracks = tracksQuery.data || [];
        const centralizedTracks = allTracks.filter(track => track.authorDid === ctx.key);
        currentPlaylist = centralizedTracks.length > 0 ? centralizedTracks : (s.customPlaylist || []);
      } else {
        currentPlaylist = s.customPlaylist || [];
      }
    }

    // Handle playlist bounds - wrap around
    let actualIndex = s.index;
    if (currentPlaylist.length > 0) {
      if (actualIndex >= currentPlaylist.length) {
        actualIndex = actualIndex % currentPlaylist.length;
        // Update the store with corrected index
        player.update(state => ({ ...state, index: actualIndex }));
      }
    }

    // Get current track from computed playlist
    current = currentPlaylist?.[actualIndex] || null;
    if (actualIndex !== lastIndex) {
      cleanupProviders();
      lastIndex = actualIndex;
    }
    if (current) {
      const meta = parseTrackUrl(current.url);
      if (meta?.provider === 'file') {
        syncFileAudio(meta.url, s.playing);
        setIframeSource('');
        iframeProvider = '';
      } else {
        resetAudioElement(playerAudio);
        const provider = meta?.provider || '';
        const url = meta?.url || '';
        if (provider !== lastProvider || url !== lastUrl) {
          iframeProvider = provider;
          setIframeSource('');
          Promise.resolve().then(() => {
            setIframeSource(buildEmbedUrl(meta, { autoplay: s.playing }) || '');
          });
          lastProvider = provider;
          lastUrl = url;
        } else {
          // Only control iframe if change wasn't triggered by iframe itself
          if (!syncingWithIframe) {
            if (!s.playing) {
              if (provider === 'youtube' && ytPlayerReady && ytPlayer && ytPlayer.getPlayerState && ytPlayer.pauseVideo) {
                const state = ytPlayer.getPlayerState();
                if (state === window.YT?.PlayerState?.PLAYING || state === window.YT?.PlayerState?.BUFFERING) {
                  ytPlayer.pauseVideo();
                }
              }
              if (provider === 'soundcloud' && scWidgetReady && scWidget && scWidget.pause) {
                scWidget.isPaused((paused) => { if (!paused) scWidget.pause(); });
              }
              if (provider === 'vimeo' && vimeoPlayerReady && vimeoPlayer && vimeoPlayer.pause && vimeoPlayer.getPaused) {
                vimeoPlayer.getPaused().then(paused => { if (!paused) vimeoPlayer.pause(); }).catch(() => {});
              }
            } else {
              if (provider === 'youtube' && ytPlayerReady && ytPlayer && ytPlayer.getPlayerState && ytPlayer.playVideo) {
                const state = ytPlayer.getPlayerState();
                if (state === window.YT?.PlayerState?.PAUSED || state === window.YT?.PlayerState?.CUED) {
                  ytPlayer.playVideo();
                }
              }
              if (provider === 'soundcloud' && scWidgetReady && scWidget && scWidget.play) {
                scWidget.isPaused((paused) => { if (paused) scWidget.play(); });
              }
              if (provider === 'vimeo' && vimeoPlayerReady && vimeoPlayer && vimeoPlayer.play && vimeoPlayer.getPaused) {
                vimeoPlayer.getPaused().then(paused => { if (paused) vimeoPlayer.play(); }).catch(() => {});
              }
            }
          }
        }
      }
    }
  });

  onMount(() => () => unsub());

  function onKey(e) {
    if (!current) return;
    // Don't handle keyboard shortcuts if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
      return;
    }
    if (e.key === ' ') { e.preventDefault(); toggle(); }
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  }

  onMount(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  let isDesktop = $state(false);

  onMount(() => {
    if (!isBrowser) return;
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      isDesktop = media.matches;
      if (media.matches) {
        mobilePanelOpen = false;
      }
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });

  onMount(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // Handle main menu
      if (menuOpen) {
        if (menuRef && menuRef.contains(target)) return;
        if (triggerRef && triggerRef.contains(target)) return;
        menuOpen = false;
      }

      // Handle track menus - check if click is within any menu or trigger
      if (trackMenuOpen !== null) {
        if (target.closest('[data-track-menu]') || target.closest('[data-track-menu-trigger]')) {
          return;
        }
        trackMenuOpen = null;
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        menuOpen = false;
        trackMenuOpen = null;
      }
    }
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  });

  onDestroy(() => {
    cleanupProviders();
  });

  async function setupIframePlayer(target: HTMLIFrameElement | null) {
    if (!target || !iframeProvider) return;
    if (iframeProvider === 'youtube') {
      await ensureYouTubeAPI();
      if (!window.YT || !window.YT.Player) return;
      if (ytPlayer) { try { ytPlayer.destroy(); } catch {} ytPlayer = null; ytPlayerReady = false; }
      ytPlayer = new window.YT.Player(target, {
        events: {
          onReady: () => {
            ytPlayerReady = true;
            if (state.playing) {
              try { ytPlayer.playVideo(); } catch {}
            }
          },
          onStateChange: (e) => {
            if (e?.data === window.YT.PlayerState.ENDED) next();
            syncingWithIframe = true;
            if (e?.data === window.YT.PlayerState.PLAYING) player.update(s => ({ ...s, playing: true }));
            if (e?.data === window.YT.PlayerState.PAUSED) player.update(s => ({ ...s, playing: false }));
            setTimeout(() => { syncingWithIframe = false; }, 100);
          }
        }
      });
    } else if (iframeProvider === 'soundcloud') {
      await ensureSCAPI();
      if (!window.SC || !window.SC.Widget) return;
      scWidget = window.SC.Widget(target);
      scWidget.bind('finish', () => next());
      scWidget.bind('play', () => {
        syncingWithIframe = true;
        player.update(s => ({ ...s, playing: true }));
        setTimeout(() => { syncingWithIframe = false; }, 100);
      });
      scWidget.bind('pause', () => {
        syncingWithIframe = true;
        player.update(s => ({ ...s, playing: false }));
        setTimeout(() => { syncingWithIframe = false; }, 100);
      });
      scWidget.bind('ready', () => {
        scWidgetReady = true;
        if (state.playing) {
          try { scWidget.play(); } catch {}
        }
      });
    } else if (iframeProvider === 'vimeo') {
      await ensureVimeoAPI();
      if (!window.Vimeo || !window.Vimeo.Player) return;
      if (vimeoPlayer) { try { vimeoPlayer.unload(); } catch {} vimeoPlayer = null; vimeoPlayerReady = false; }
      vimeoPlayer = new window.Vimeo.Player(target);
      vimeoPlayer.on('loaded', () => {
        vimeoPlayerReady = true;
        if (state.playing) {
          vimeoPlayer.play().catch(() => {});
        }
      });
      vimeoPlayer.on('ended', () => next());
      vimeoPlayer.on('play', () => {
        syncingWithIframe = true;
        player.update(s => ({ ...s, playing: true }));
        setTimeout(() => { syncingWithIframe = false; }, 100);
      });
      vimeoPlayer.on('pause', () => {
        syncingWithIframe = true;
        player.update(s => ({ ...s, playing: false }));
        setTimeout(() => { syncingWithIframe = false; }, 100);
      });
    }
  }

  async function onIframeLoad(event: Event) {
    try {
      const target = event?.currentTarget as HTMLIFrameElement | null;
      if (!target || target !== playerIframe) return;
      await setupIframePlayer(target);
    } catch {}
  }

  const t = (key, vars = {}) => translate($locale, key, vars);

  function openCurrentUrl() {
    if (!current) return;
    const url = parseTrackUrl(current?.url || '')?.url || current?.url || '';
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  function openDiscogsLink(track?: any) {
    const link = track?.discogsUrl || track?.discogs_url;
    if (!link) return;
    window.open(link, '_blank', 'noopener');
  }

  const currentHandle = $derived(
    state.context?.handle ?? current?.authorHandle ?? current?.author_handle ?? undefined
  );

  const discogsUrl = $derived(current?.discogsUrl ?? current?.discogs_url ?? '');
  const queueCount = $derived(playlist?.length ?? 0);
  const filteredPlaylist = $derived.by(() => {
    if (!searchQuery.trim()) {
      return (playlist || []).map((track, idx) => ({ track, originalIdx: idx }));
    }
    const query = searchQuery.toLowerCase();
    return (playlist || [])
      .map((track, idx) => ({ track, originalIdx: idx }))
      .filter(({ track }) => {
        const title = (track?.title || '').toLowerCase();
        const handle = (track?.authorHandle || track?.author_handle || '').toLowerCase();
        const description = (track?.description || '').toLowerCase();
        return title.includes(query) || handle.includes(query) || description.includes(query);
      });
  });

  let profileData = $state(null);
  let lastFetchedHandle = $state('');

  const currentProfileName = $derived(
    profileData?.displayName || current?.authorDisplayName || current?.authorHandle || currentHandle || t('trackItem.untitled')
  );
  const currentTrackTitle = $derived(current?.title || t('trackItem.untitled'));
  const currentTrackHref = $derived.by(() => {
    if (!current?.uri || !currentHandle) return null;
    return buildViewHash(currentHandle, current.uri);
  });

  // Get profile from cache reactively, load if not cached
  $effect(() => {
    if (currentHandle && currentHandle !== lastFetchedHandle) {
      lastFetchedHandle = currentHandle;

      // First, try to get from cache (instant)
      const cached = getProfileFromCache(currentHandle);
      if (cached) {
        profileData = cached;
      }

      // Then load fresh data in background (will update cache)
      loadProfile(currentHandle).then(data => {
        if (currentHandle === lastFetchedHandle) {
          profileData = data;
        }
      }).catch(() => {
        // Keep cached data if fetch fails
        if (!profileData) {
          profileData = null;
        }
      });
    }
  });

  const hasBanner = $derived(!!profileData?.banner);
</script>

{#if current}
  <aside
    class="player {extraClass}"
    class:player--hidden={!visible}
    style={visible && !isDesktop ? 'max-height:100dvh;' : ''}
  >
    <section>
      {#if hasBanner}
        <div
          class="player-banner"
          style={`background-image: url(${profileData.banner})`}
        ></div>
      {/if}
      <div class="player-inner">
        <header class="player-header">
          <div class="player-header-info">
            <Avatar
              src={profileData?.avatar || ''}
              alt={currentProfileName}
              size={isDesktop ? "md" : "sm"}
            />
            <div class="player-track-meta">
              {#if currentTrackHref}
                <Link href={currentTrackHref} class="player-track-title">
                  <span>{currentTrackTitle}</span>
                </Link>
              {:else}
                <p class="player-track-title">
                  <span>{currentTrackTitle}</span>
                </p>
              {/if}
              {#if currentHandle}
                <Link href={`/@${currentHandle}`} class="player-track-author">
                  <span>@{currentHandle}</span>
                </Link>
              {:else if state.context?.handle}
                <span class="player-track-author">
                  <span>@{state.context.handle}</span>
                </span>
              {/if}
            </div>
          </div>
          <div class="player-header-actions">
            <div class="menu-wrapper">
              <button
                bind:this={triggerRef}
                type="button"
                class="menu-trigger"
                class:active={menuOpen}
                onclick={() => toggleMenu()}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MoreVertical class="icon" />
                <span class="sr-only">Track options</span>
              </button>
              {#if menuOpen}
                <div
                  bind:this={menuRef}
                  class="menu"
                  role="menu"
                >
                  {#if currentHandle && current?.uri}
                    <a
                      href={buildViewHash(currentHandle, current.uri) || '#'}
                      class="menu-item"
                      onclick={closeMenu}
                    >
                      <Eye class="icon" />
                      View track
                    </a>
                  {/if}
                  {#if current?.url}
                    <a
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="menu-item"
                      onclick={closeMenu}
                    >
                      <ExternalLink class="icon" />
                      Open media URL
                    </a>
                  {/if}
                  {#if discogsUrl}
                    <a
                      href={discogsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="menu-item"
                      onclick={closeMenu}
                    >
                      <DiscIcon class="icon" />
                      Open Discogs
                    </a>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        </header>

        <div class="player-grid">
          <div class="player-embed">
            {#if parseTrackUrl(current.url)?.provider === 'file'}
              <div class="player-media">
                <audio
                  bind:this={playerAudio}
                  onended={next}
                  controls
                ></audio>
              </div>
            {:else if iframeSrc}
              <div class="player-media">
                <iframe
                  bind:this={playerIframe}
                  src={iframeSrc}
                  title="Embedded player"
                  allow="autoplay; encrypted-media"
                  allowfullscreen
                  onload={onIframeLoad}
                ></iframe>
              </div>
            {/if}
          </div>

          <div class="track-list-container">
            <div class="track-list-search">
              <Search class="track-list-search-icon" />
              <Input
                type="text"
                placeholder={t('player.searchPlaceholder')}
                bind:value={searchQuery}
              />
            </div>
            <div class="track-list">
              {#each filteredPlaylist as { track, originalIdx }}
                <TrackListItemSimple
                  {track}
                  index={originalIdx}
                  isActive={originalIdx === state.index}
                  context={state.context}
                  onplay={() => playIndex(originalIdx)}
                  ondelete={deleteTrack}
                />
              {/each}
            </div>
          </div>
        </div>
      </div>

      <div class="player-controls" class:player-controls--mobile={!isDesktop}>
        <button
          type="button"
          class="player-btn player-btn--sm"
          class:player-btn--active={state.isShuffled}
          onclick={() => {
            if (!state.isShuffled && playlist.length > 0) {
              shuffleCurrentPlaylist(playlist)
            } else {
              toggleShuffle()
            }
          }}
          aria-label="Shuffle"
        >
          <Shuffle class="icon-sm" />
        </button>
        <button
          type="button"
          class="player-btn player-btn--sm"
          onclick={prev}
          aria-label={t('player.previous')}
        >
          <SkipBack class="icon-sm" />
        </button>
        <button
          type="button"
          class="player-btn player-btn--lg"
          class:player-btn--active={state.playing}
          onclick={toggle}
          aria-label={t('player.toggle')}
        >
          {#if state.playing}
            <Pause class="icon" />
          {:else}
            <Play class="icon" />
          {/if}
        </button>
        <button
          type="button"
          class="player-btn player-btn--sm"
          onclick={next}
          aria-label={t('player.next')}
        >
          <SkipForward class="icon-sm" />
        </button>
      </div>
    </section>
  </aside>
{/if}

<style>
  .player {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-inline: var(--size-1);
    transition: all 300ms;
    opacity: 1;
  }

  .player--hidden {
    height: 0;
    width: 0;
    margin: 0;
    opacity: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .player > section {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background: var(--surface-2);
    border-radius: var(--radius-3);
    width: 100%;
    overflow: hidden;
    position: relative;
  }

  @media (min-width: 1024px) {
    .player {
      padding-inline: 0;
    }
  }

  .player-banner {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    border-radius: var(--radius-3);
    filter: blur(4px);
  }

  .player-inner {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .player-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--size-3);
    padding: var(--size-3);
    padding-block-end: var(--size-2);
    border-block-end: 1px solid var(--foreground);
  }

  .player-header-info {
    display: flex;
    align-items: center;
    gap: var(--size-3);
    min-width: 0;
    flex: 1;
  }

  .player-track-meta {
    min-width: 0;
    flex: 1;
  }

  .player-track-title {
    display: block;
    font-size: var(--font-size-1);
    font-weight: var(--font-weight-6);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-decoration: none;
    color: inherit;
    margin: 0;
  }

  .player-track-title:hover {
    color: var(--foreground);
  }

  .player-track-title span,
  .player-track-author span {
    display: inline-block;
    padding: var(--size-1);
    border-radius: var(--radius-2);
    background: var(--background);
  }

  .player-track-author {
    display: block;
    font-size: var(--font-size-0);
    color: var(--muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-decoration: none;
  }

  .player-track-author:hover {
    text-decoration: underline;
    color: var(--foreground);
  }

  .player-header-actions {
    display: flex;
    align-items: center;
    gap: var(--size-1);
    flex-shrink: 0;
  }

  .player-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    flex: 1;
    min-height: 0;
    width: 100%;
  }

  .player-embed {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 16rem;
    flex: 1;
  }

  .player-media {
    background: var(--background);
    flex: 1;
    min-height: 220px;
  }

  .player-media audio,
  .player-media iframe {
    width: 100%;
    height: 100%;
  }

  .track-list-container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 14rem;
    max-height: 50vh;
  }

  @media (min-width: 1024px) {
    .track-list-container {
      max-height: none;
      height: 100%;
    }
  }

  .track-list-search {
    position: relative;
    padding: var(--size-3);
  }

  .track-list-search :global(input) {
    padding-inline-start: var(--size-7);
  }

  .track-list-search-icon {
    position: absolute;
    left: var(--size-5);
    top: 50%;
    transform: translateY(-50%);
    width: var(--size-4);
    height: var(--size-4);
    color: var(--muted-foreground);
  }

  .track-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    border-block-start: 1px solid var(--foreground);
    background: var(--background);
    margin-block: 0;
  }

  .track-list > :global(*) {
    border-radius: 0;
    border-inline: none;
  }

  .player-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-2);
    padding-block: var(--size-2);
    border-block-start: 1px solid var(--foreground);
    background: var(--background);
    position: relative;
    z-index: 10;
  }

  .player-controls--mobile {
    flex-shrink: 0;
  }

  .player-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 50%;
    font-weight: var(--font-weight-5);
    transition: all 200ms var(--ease-2);
    border: 2px solid var(--foreground);
    background: var(--background);
    color: var(--foreground);
    cursor: pointer;
  }

  .player-btn:hover {
    background: var(--foreground);
    color: var(--background);
    border-color: var(--background);
  }

  .player-btn--sm {
    width: var(--size-7);
    height: var(--size-7);
  }

  .player-btn--lg {
    width: var(--size-8);
    height: var(--size-8);
  }

  .player-btn--active {
    background: var(--foreground);
    color: var(--background);
    box-shadow: var(--shadow-2);
  }

  .player-btn--active:hover {
    border-color: var(--background);
  }

  .player-btn :global(svg) {
    width: var(--size-3);
    height: var(--size-3);
    stroke: currentColor !important;
    color: currentColor !important;
  }

  .player-btn--lg :global(svg) {
    width: var(--size-4);
    height: var(--size-4);
  }

  .menu-wrapper {
    position: relative;
  }

  .menu {
    position: absolute;
    right: 0;
    z-index: 40;
    margin-block-start: var(--size-1);
    width: 12rem;
    border-radius: var(--radius-2);
    border: 1px solid var(--foreground);
    background: var(--background);
    box-shadow: var(--shadow-3);
  }
</style>
