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
  const props = $props();
  const extraClass = $derived(props.class || '');
  const visible = $derived(props.visible !== undefined ? props.visible : true);

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
  let mobilePanelOpen = $state(false);
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
  <div class={cn("pointer-events-none", extraClass)}>
    <div
      class={cn(
        "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden",
        mobilePanelOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      onclick={() => { mobilePanelOpen = false; }}
    ></div>

    <aside
      class={cn(
        "pointer-events-auto flex flex-col gap-4 border-2 border-primary/20 bg-card/98 shadow-2xl backdrop-blur-xl rounded-3xl p-5 transition-all duration-300",
        "fixed inset-y-4 z-40 w-[24rem] hidden lg:flex animate-in",
        visible ? "right-4" : "-right-96"
      )}
    >
      <!-- Current track info -->
      <div class="flex items-center gap-3 min-w-0">
        <Avatar
          src={profileData?.avatar || ''}
          alt={profileData?.displayName || currentHandle || 'Profile'}
          size="md"
          class="shadow-lg shrink-0"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold truncate">{current.title || t('trackItem.untitled')}</p>
          {#if currentHandle}
            <Link href={`/@${currentHandle}`} class="text-xs text-muted-foreground hover:underline hover:text-primary transition-colors truncate block">
              @{currentHandle}
            </Link>
          {/if}
        </div>
      </div>

      <!-- Player iframe/audio -->
      {#if parseTrackUrl(current.url)?.provider === 'file'}
        <div class="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-purple-500/10 aspect-video border-2 border-primary/20 shadow-lg">
          <audio bind:this={playerAudio} onended={next} controls class="w-full"></audio>
        </div>
      {:else if iframeSrc}
        <div class="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-purple-500/10 aspect-video border-2 border-primary/20 shadow-lg">
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

      <!-- Player controls -->
      <div class="flex items-center justify-center gap-2">
        <Button
          variant={state.isShuffled ? "default" : "outline"}
          size="icon"
          class="h-9 w-9"
          onclick={toggleShuffle}
          aria-label="Shuffle"
        >
          <Shuffle class="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" class="h-9 w-9" onclick={prev} aria-label={t('player.previous')}>
          <SkipBack class="h-4 w-4" />
        </Button>
        <Button size="icon" class="h-11 w-11 shadow-lg bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90" onclick={toggle} aria-label={t('player.toggle')}>
          {#if state.playing}
            <Pause class="h-5 w-5" />
          {:else}
            <Play class="h-5 w-5" />
          {/if}
        </Button>
        <Button variant="outline" size="icon" class="h-9 w-9" onclick={next} aria-label={t('player.next')}>
          <SkipForward class="h-4 w-4" />
        </Button>
      </div>

      <!-- Queue -->
      <div class="space-y-3 flex-1 flex flex-col min-h-0">
        <div class="px-1">
          <p class="text-xs uppercase tracking-wider font-semibold text-primary flex items-center gap-2">
            <ListMusic class="h-4 w-4" />
            {t('player.queue')}
          </p>
          <p class="text-sm text-muted-foreground mt-1">{queueCount} {queueCount === 1 ? 'track' : 'tracks'}</p>
        </div>
        <div class="flex-1 overflow-y-auto rounded-2xl border-2 border-primary/10 divide-y bg-gradient-to-b from-muted/30 to-transparent">
          {#each state.playlist as track, idx}
            <button
              type="button"
              class={cn(
                "w-full text-left px-4 py-3 transition-all duration-200 flex flex-col gap-1.5 relative",
                idx === state.index
                  ? "bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border-l-4 border-primary shadow-sm"
                  : "hover:bg-muted/60 hover:pl-5"
              )}
              onclick={() => playIndex(idx)}
            >
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span class="font-semibold text-foreground">{idx + 1}</span>
                {#if track?.authorHandle || track?.author_handle}
                  <span>@{track.authorHandle || track.author_handle}</span>
                {/if}
              </div>
              <p class="truncate text-sm">{track.title || t('trackItem.untitled')}</p>
              {#if track.description}
                <p class="text-xs text-muted-foreground truncate">{track.description}</p>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </aside>

    <div
      class={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-md bg-gradient-to-b from-background to-muted/20 backdrop-blur-xl shadow-2xl border-l-2 border-primary/20 p-4 flex flex-col gap-4 transition-transform lg:hidden pointer-events-auto overflow-y-auto",
        mobilePanelOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div class="flex items-center justify-between shrink-0">
        <div>
          <p class="text-xs text-primary uppercase font-semibold tracking-wider">{t('player.queue')}</p>
          <p class="text-sm text-muted-foreground">{queueCount} {queueCount === 1 ? 'track' : 'tracks'}</p>
        </div>
        <Button variant="ghost" size="icon" onclick={() => { mobilePanelOpen = false; }}>
          <X class="h-5 w-5" />
        </Button>
      </div>
      {#if parseTrackUrl(current.url)?.provider === 'file'}
        <div class="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-purple-500/10 aspect-video border-2 border-primary/20 shadow-lg shrink-0 flex items-center justify-center">
          <p class="text-sm text-muted-foreground px-4 text-center">Audio Player<br/>(controls at bottom)</p>
        </div>
      {:else if iframeSrc}
        <div class="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-purple-500/10 aspect-video border-2 border-primary/20 shadow-lg shrink-0 bg-muted/20">
        </div>
      {/if}
      <div class="flex-1 min-h-0 overflow-y-auto rounded-2xl border-2 border-primary/10 divide-y bg-gradient-to-b from-muted/30 to-transparent">
        {#each state.playlist as track, idx}
          <button
            type="button"
            class={cn(
              "w-full text-left px-4 py-3 transition-all duration-200 flex flex-col gap-1.5 relative",
              idx === state.index
                ? "bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border-l-4 border-primary shadow-sm"
                : "hover:bg-muted/60 hover:pl-5"
            )}
            onclick={() => playIndex(idx)}
          >
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span class="font-semibold text-foreground">{idx + 1}</span>
              {#if track?.authorHandle || track?.author_handle}
                <span>@{track.authorHandle || track.author_handle}</span>
              {/if}
            </div>
            <p class="truncate text-sm">{track.title || t('trackItem.untitled')}</p>
            {#if track.description}
              <p class="text-xs text-muted-foreground truncate">{track.description}</p>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}
