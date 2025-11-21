<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { player, toggle, next, prev, playIndex, toggleShuffle } from '$lib/player/store';
  import { parseTrackUrl, buildEmbedUrl } from '$lib/services/url-patterns';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Play, Pause, SkipForward, SkipBack, ExternalLink, ArrowUpRight, Disc as DiscIcon, ListMusic, X, LayoutList, Shuffle, MoreVertical, Eye, Search } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';
  import { cn, menuItemClass, menuTriggerClass } from '$lib/utils';
  import Link from '$lib/components/Link.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { getProfile } from '$lib/services/r4-service';
  import { buildViewHash, buildEditHash } from '$lib/services/track-uri';
  import { session } from '$lib/state/session';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Pencil, Trash2 } from 'lucide-svelte';
  import { deleteTrackByUri } from '$lib/services/r4-service';
  let {
    class: classProp = '',
    visible: visibleProp = true,
    mobilePanelOpen = $bindable(false)
  } = $props();
  const extraClass = $derived(classProp);
  const visible = $derived(visibleProp);

  let state = $state({ playlist: [], index: -1, playing: false });
  let current = $state(null);
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
      await deleteTrackByUri(uri);
      closeTrackMenu();
      // Remove from playlist
      player.update(s => ({
        ...s,
        playlist: s.playlist.filter(t => t.uri !== uri)
      }));
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
    current = s.playlist?.[s.index] || null;
    if (s.index !== lastIndex) {
      cleanupProviders();
      lastIndex = s.index;
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
  const queueCount = $derived(state.playlist?.length ?? 0);
  const filteredPlaylist = $derived.by(() => {
    if (!searchQuery.trim()) {
      return (state.playlist || []).map((track, idx) => ({ track, originalIdx: idx }));
    }
    const query = searchQuery.toLowerCase();
    return (state.playlist || [])
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

  $effect(() => {
    if (currentHandle && currentHandle !== lastFetchedHandle) {
      lastFetchedHandle = currentHandle;
      getProfile(currentHandle).then(data => {
        if (currentHandle === lastFetchedHandle) {
          profileData = data;
        }
      }).catch(() => {
        profileData = null;
      });
    }
  });
</script>

{#if current}
  <aside
    class={cn(
      extraClass,
      "flex flex-col transition-all duration-300 px-1 lg:px-0 h-full",
      !visible ? "h-0 w-0 m-0 opacity-0 pointer-events-none overflow-hidden" : "opacity-100"
    )}
    style={visible && !isDesktop ? 'max-height:100dvh;' : ''}
  >
    <section
      class="flex flex-col flex-1 min-h-0 gap-0 border border-foreground bg-card/95 shadow rounded-3xl p-0 w-full overflow-hidden"
    >
      <div class="flex flex-col gap-3 flex-1 min-h-0">
        <div class={cn("flex items-start gap-3 px-3 pt-3 pb-2 border-b border-foreground", isDesktop ? "min-w-0" : "justify-between items-start")}>
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <Avatar
              src={profileData?.avatar || ''}
              alt={currentProfileName}
              size={isDesktop ? "md" : "sm"}
              class="shadow-lg shrink-0"
            />
            <div class="min-w-0 flex-1">
              {#if currentTrackHref}
                <Link href={currentTrackHref} class="text-sm font-semibold truncate block hover:text-foreground transition-colors">
                  {currentTrackTitle}
                </Link>
              {:else}
                <p class="text-sm font-semibold truncate">{currentTrackTitle}</p>
              {/if}
              {#if currentHandle}
                <Link href={`/@${currentHandle}`} class="text-xs text-muted-foreground hover:underline hover:text-foreground transition-colors truncate block">
                  @{currentHandle}
                </Link>
              {:else if state.context?.handle}
                <span class="text-xs text-muted-foreground truncate block">@{state.context.handle}</span>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-0.5 shrink-0 pr-3">
            <div class="relative">
              <button
                bind:this={triggerRef}
                type="button"
                  class={cn(menuTriggerClass(menuOpen), "h-7 w-7")}
                  onclick={() => toggleMenu()}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                <MoreVertical class="h-3.5 w-3.5 text-current" />
                  <span class="sr-only">Track options</span>
                </button>
              {#if menuOpen}
                <div
                  bind:this={menuRef}
                  class="absolute right-0 z-40 mt-1.5 w-48 rounded-md border border-foreground bg-background text-foreground shadow-lg"
                  role="menu"
                >
                  {#if currentHandle && current?.uri}
                    <a
                      href={buildViewHash(currentHandle, current.uri) || '#'}
                      class={menuItemClass}
                      onclick={closeMenu}
                    >
                      <Eye class="h-4 w-4" />
                      View track
                    </a>
                  {/if}
                  {#if current?.url}
                    <a
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class={menuItemClass}
                      onclick={closeMenu}
                    >
                      <ExternalLink class="h-4 w-4" />
                      Open media URL
                    </a>
                  {/if}
                  {#if discogsUrl}
                    <a
                      href={discogsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class={menuItemClass}
                      onclick={closeMenu}
                    >
                      <DiscIcon class="h-4 w-4" />
                      Open Discogs
                    </a>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div
          class="grid gap-3 flex-1 min-h-0 w-full"
          style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));"
        >
          <div class="flex flex-col min-h-0 min-w-[16rem] flex-1">
            {#if parseTrackUrl(current.url)?.provider === 'file'}
              <div class="bg-background flex-1 min-h-[220px]">
                <audio
                  bind:this={playerAudio}
                  onended={next}
                  controls
                  class="w-full h-full"
                ></audio>
              </div>
            {:else if iframeSrc}
              <div class="bg-background flex-1 min-h-[220px]">
                <iframe
                  bind:this={playerIframe}
                  src={iframeSrc}
                  title="Embedded player"
                  allow="autoplay; encrypted-media"
                  allowfullscreen
                  onload={onIframeLoad}
                  class="w-full h-full"
                ></iframe>
              </div>
            {/if}
          </div>

          <div class="flex flex-col min-h-0 min-w-[14rem] space-y-2 h-full">
            <div class="px-3">
              <div class="relative">
                <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('player.searchPlaceholder')}
                  bind:value={searchQuery}
                  class="h-9 pl-9 pr-3 text-sm"
                />
              </div>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto rounded-none border-t border-foreground border-l-0 border-r-0 divide-y bg-background">
              {#each filteredPlaylist as { track, originalIdx }}
                {@const trackHandle = (track?.authorHandle || track?.author_handle || state.context?.handle || '').replace(/^@/, '')}
                {@const trackHref = track?.uri && trackHandle ? buildViewHash(trackHandle, track.uri) : null}
                {@const trackDid = track?.authorDid || track?.author_did || ''}
                {@const isEditable = $session?.did && trackDid && $session.did === trackDid}
                {@const discogsLink = track?.discogsUrl || track?.discogs_url || ''}
                <a
                  href={trackHref || '#'}
                  class={cn(
                    "w-full px-2.5 py-2 transition-all duration-150 flex flex-row flex-nowrap gap-2 relative text-sm items-start",
                    originalIdx !== state.index && "hover:bg-foreground/10"
                  )}
                  onclick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                      e.preventDefault();
                      playIndex(originalIdx);
                    }
                  }}
                >
                  <span class="text-[12px] text-muted-foreground font-semibold shrink-0 w-5 text-left pt-0.5">
                    {originalIdx + 1}
                  </span>
                  <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span class={cn(
                      "truncate text-sm font-medium leading-tight transition-colors px-1.5 py-0.5 rounded",
                      originalIdx === state.index
                        ? "bg-foreground text-background"
                        : "text-foreground"
                    )}>
                      {track.title || t('trackItem.untitled')}
                    </span>
                    {#if track.description}
                      <span class="truncate text-[12px] text-muted-foreground leading-tight">
                        {track.description}
                      </span>
                    {/if}
                  </div>
                  <div class="relative shrink-0">
                    <button
                      data-track-menu-trigger
                      type="button"
                      class={cn(menuTriggerClass(trackMenuOpen === originalIdx), "h-7 w-7")}
                      onclick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTrackMenu(originalIdx); }}
                      aria-haspopup="menu"
                      aria-expanded={trackMenuOpen === originalIdx}
                    >
                      <MoreVertical class="h-3.5 w-3.5 text-current" />
                      <span class="sr-only">{t('player.trackOptions')}</span>
                    </button>
                    {#if trackMenuOpen === originalIdx}
                      <div
                        data-track-menu
                        class="absolute right-0 z-40 mt-1.5 w-48 rounded-md border border-foreground bg-background text-foreground shadow-lg"
                        role="menu"
                      >
                        <button
                          type="button"
                          class={menuItemClass}
                          onclick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            closeTrackMenu();
                            if (trackHref) {
                              goto(resolve(trackHref));
                            }
                          }}
                        >
                          <Eye class="h-4 w-4" />
                          {t('trackItem.view')}
                        </button>
                        {#if isEditable && track.uri && trackHandle}
                          <button
                            type="button"
                            class={menuItemClass}
                            onclick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeTrackMenu();
                              // Navigate to edit page
                              if (track.uri && trackHandle) {
                                const href = buildEditHash(trackHandle, track.uri);
                                if (href) goto(resolve(href));
                              }
                            }}
                          >
                            <Pencil class="h-4 w-4" />
                            {t('trackItem.edit')}
                          </button>
                        {/if}
                        {#if track.url}
                          <button
                            type="button"
                            class={menuItemClass}
                            onclick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeTrackMenu();
                              window.open(track.url, '_blank', 'noopener');
                            }}
                          >
                            <ExternalLink class="h-4 w-4" />
                            {t('trackItem.openMediaUrl')}
                          </button>
                        {/if}
                        {#if discogsLink}
                          <button
                            type="button"
                            class={menuItemClass}
                            onclick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeTrackMenu();
                              window.open(discogsLink, '_blank', 'noopener');
                            }}
                          >
                            <DiscIcon class="h-4 w-4" />
                            Open Discogs
                          </button>
                        {/if}
                        {#if isEditable}
                          <button
                            type="button"
                            class={cn(menuItemClass, "text-destructive hover:text-destructive")}
                            onclick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${track.title || 'Untitled'}"?`)) {
                                deleteTrack(track.uri);
                              } else {
                                closeTrackMenu();
                              }
                            }}
                          >
                            <Trash2 class="h-4 w-4" />
                            {t('trackItem.delete')}
                          </button>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </a>
              {/each}
            </div>
          </div>
        </div>
      </div>

        <div class={cn("flex items-center justify-center gap-2 pt-1 pb-2 border-t border-foreground bg-background", isDesktop ? '' : 'shrink-0')}>
          <button
            type="button"
            class={cn(
            "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all duration-200 border-2 bg-background",
            state.isShuffled
              ? "text-background border-foreground bg-foreground shadow-sm hover:border-background"
              : "text-foreground border-foreground hover:bg-foreground hover:text-background hover:border-background"
          )}
          onclick={toggleShuffle}
          aria-label="Shuffle"
        >
          <Shuffle class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all duration-200 border-2 bg-background text-foreground border-foreground hover:bg-foreground hover:text-background hover:border-background"
          onclick={prev}
          aria-label={t('player.previous')}
        >
          <SkipBack class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class={cn(
            "flex items-center justify-center h-10 w-10 rounded-full text-sm font-medium transition-all duration-200 border-2 bg-background",
            state.playing
              ? "text-background border-foreground bg-foreground shadow-sm hover:border-background"
              : "text-foreground border-foreground hover:bg-foreground hover:text-background hover:border-background"
          )}
          onclick={toggle}
          aria-label={t('player.toggle')}
        >
          {#if state.playing}
            <Pause class="h-4 w-4" />
          {:else}
            <Play class="h-4 w-4" />
          {/if}
        </button>
        <button
          type="button"
          class="flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all duration-200 border-2 bg-background text-foreground border-foreground hover:bg-foreground hover:text-background hover:border-background"
          onclick={next}
          aria-label={t('player.next')}
        >
          <SkipForward class="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  </aside>
{/if}
