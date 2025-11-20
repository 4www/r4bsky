<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { player, toggle, next, prev, playIndex, toggleShuffle } from '$lib/player/store';
  import { parseTrackUrl, buildEmbedUrl } from '$lib/services/url-patterns';
  import { Button } from '$lib/components/ui/button';
  import { Play, Pause, SkipForward, SkipBack, ExternalLink, ArrowUpRight, Disc as DiscIcon, ListMusic, X, LayoutList, Shuffle } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';
  import { cn } from '$lib/utils';
  import Link from '$lib/components/Link.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { getProfile } from '$lib/services/r4-service';
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
  function cleanupProviders() {
    try { if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy(); } catch {}
    ytPlayer = null;
    ytPlayerReady = false;
    try { if (vimeoPlayer && vimeoPlayer.unload) vimeoPlayer.unload(); } catch {}
    vimeoPlayer = null;
    vimeoPlayerReady = false;
    scWidget = null;
    scWidgetReady = false;
  }

  let lastUrl = $state('');
  let lastProvider = $state('');
  let syncingWithIframe = $state(false);

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

  let profileData = $state(null);
  let lastFetchedHandle = $state('');

  const currentProfileName = $derived(
    profileData?.displayName || current?.authorDisplayName || current?.authorHandle || currentHandle || t('trackItem.untitled')
  );
  const currentTrackTitle = $derived(current?.title || t('trackItem.untitled'));

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
      "flex flex-col transition-all duration-300",
      !visible ? "h-0 w-0 m-0 opacity-0 pointer-events-none overflow-hidden" : "opacity-100"
    )}
    style={visible && !isDesktop ? 'max-height:50dvh;' : ''}
  >
    <section
      class="flex flex-col flex-1 min-h-0 gap-4 border border-primary/20 bg-card/95 shadow rounded-3xl p-3 lg:p-4"
    >
      <div class="flex flex-col gap-4 flex-1 min-h-0">
        <div class={cn("flex items-start gap-3", isDesktop ? "min-w-0" : "justify-between items-start")}>
          <div class="flex items-center gap-3 min-w-0">
            <Avatar
              src={profileData?.avatar || ''}
              alt={currentProfileName}
              size={isDesktop ? "md" : "sm"}
              class="shadow-lg shrink-0"
            />
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">{currentTrackTitle}</p>
              {#if currentHandle}
                <Link href={`/@${currentHandle}`} class="text-xs text-muted-foreground hover:underline hover:text-primary transition-colors truncate block">
                  @{currentHandle}
                </Link>
              {:else if state.context?.handle}
                <span class="text-xs text-muted-foreground truncate block">@{state.context.handle}</span>
              {/if}
            </div>
          </div>
        </div>

        <div
          class="grid gap-3 flex-1 min-h-0 w-full"
          style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));"
        >
          <div class="flex flex-col min-h-0 min-w-[16rem]">
            {#if parseTrackUrl(current.url)?.provider === 'file'}
              <div class="rounded-xl overflow-hidden bg-muted/30 border border-primary/20 shadow">
                <audio
                  bind:this={playerAudio}
                  onended={next}
                  controls
                  class="w-full h-full min-h-[220px]"
                ></audio>
              </div>
            {:else if iframeSrc}
              <div class="rounded-xl overflow-hidden bg-muted/30 border border-primary/20 shadow">
                <div class="aspect-video w-full min-h-[220px]">
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
              </div>
            {/if}
          </div>

          <div class="flex flex-col min-h-0 min-w-[14rem] space-y-1.5 h-full">
            <div class="px-0.5">
              <p class="text-[11px] uppercase tracking-wider font-semibold text-primary flex items-center gap-1.5">
                <ListMusic class="h-3.5 w-3.5" />
                {t('player.queue')}
              </p>
              <p class="text-[11px] text-muted-foreground mt-0.5">{queueCount} {queueCount === 1 ? 'track' : 'tracks'}</p>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto rounded-xl border border-primary/10 divide-y bg-gradient-to-b from-muted/20 to-transparent">
              {#each state.playlist as track, idx}
                <button
                  type="button"
                  class={cn(
                    "w-full text-left px-2.5 py-1.5 transition-all duration-150 flex flex-col gap-1 relative text-xs",
                    idx === state.index
                      ? "bg-primary/15 text-primary border-l-3 border-primary shadow-sm font-medium"
                      : "hover:bg-muted/50 hover:pl-3"
                  )}
                  onclick={() => playIndex(idx)}
                >
                  <div class="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span class="font-semibold text-foreground">{idx + 1}</span>
                    {#if track?.authorHandle || track?.author_handle}
                      <span>@{track.authorHandle || track.author_handle}</span>
                    {/if}
                  </div>
                  <p class="truncate text-xs font-medium text-foreground">{track.title || t('trackItem.untitled')}</p>
                  {#if track.description}
                    <p class="text-[11px] text-muted-foreground truncate">{track.description}</p>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <div class={cn("flex items-center justify-center gap-2 pt-1", isDesktop ? '' : 'shrink-0')}>
        <button
          type="button"
          class={cn(
            "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all duration-200 border-2",
            state.isShuffled
              ? "text-foreground border-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground border-transparent hover:border-primary/50"
          )}
          onclick={toggleShuffle}
          aria-label="Shuffle"
        >
          <Shuffle class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all duration-200 border-2 text-muted-foreground hover:text-foreground border-transparent hover:border-primary/50"
          onclick={prev}
          aria-label={t('player.previous')}
        >
          <SkipBack class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class={cn(
            "flex items-center justify-center h-10 w-10 rounded-full text-sm font-medium transition-all duration-200 border-2",
            state.playing
              ? "text-foreground border-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground border-transparent hover:border-primary/50"
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
          class="flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all duration-200 border-2 text-muted-foreground hover:text-foreground border-transparent hover:border-primary/50"
          onclick={next}
          aria-label={t('player.next')}
        >
          <SkipForward class="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  </aside>
{/if}
