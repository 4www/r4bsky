<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { player, toggle, next, prev, playIndex, shuffle } from '$lib/player/store';
  import { parseTrackUrl, buildEmbedUrl } from '$lib/services/url-patterns';
  import { Button } from '$lib/components/ui/button';
  import { Play, Pause, SkipForward, SkipBack, ExternalLink, ArrowUpRight, Disc as DiscIcon, ListMusic, X, LayoutList, Shuffle } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';
  import { cn } from '$lib/utils';
  import { resolve } from '$app/paths';
  const props = $props();
  const extraClass = $derived(props.class || '');

  let state = $state({ playlist: [], index: -1, playing: false });
  let current = $state(null);
  let audio = $state(null);
  let iframeSrc = $state('');
  let iframeEl = $state(null);
  let iframeProvider = $state('');
  let ytPlayer = $state(null);
  let scWidget = $state(null);
  let vimeoPlayer = $state(null);
  let ytApiReady = $state(null);
  let scApiReady = $state(null);
  let vimeoApiReady = $state(null);
  let mobilePanelOpen = $state(false);

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
    try { if (vimeoPlayer && vimeoPlayer.unload) vimeoPlayer.unload(); } catch {}
    vimeoPlayer = null;
    scWidget = null;
  }

  let lastUrl = $state('');
  let lastProvider = $state('');

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
        if (audio) {
          audio.src = meta.url;
          if (s.playing) audio.play().catch(() => {});
          else audio.pause();
        }
        iframeSrc = '';
        iframeProvider = '';
      } else {
        if (audio) { audio.pause(); audio.removeAttribute('src'); }
        const provider = meta?.provider || '';
        const url = meta?.url || '';
        if (provider !== lastProvider || url !== lastUrl) {
          iframeProvider = provider;
          iframeSrc = '';
          Promise.resolve().then(() => {
            iframeSrc = buildEmbedUrl(meta, { autoplay: s.playing }) || '';
          });
          lastProvider = provider;
          lastUrl = url;
        } else {
          if (!s.playing) {
            if (provider === 'youtube' && ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
            if (provider === 'soundcloud' && scWidget && scWidget.pause) scWidget.pause();
            if (provider === 'vimeo' && vimeoPlayer && vimeoPlayer.pause) vimeoPlayer.pause().catch(() => {});
          } else {
            if (provider === 'youtube' && ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
            if (provider === 'soundcloud' && scWidget && scWidget.play) scWidget.play();
            if (provider === 'vimeo' && vimeoPlayer && vimeoPlayer.play) vimeoPlayer.play().catch(() => {});
          }
        }
      }
    }
  });

  onMount(() => () => unsub());

  function onKey(e) {
    if (!current) return;
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

  async function onIframeLoad() {
    try {
      if (!iframeEl) return;
      if (iframeProvider === 'youtube') {
        await ensureYouTubeAPI();
        if (!window.YT || !window.YT.Player) return;
        if (ytPlayer) { try { ytPlayer.destroy(); } catch {} ytPlayer = null; }
        ytPlayer = new window.YT.Player(iframeEl, {
          events: {
            onReady: () => { if (state.playing) ytPlayer.playVideo(); },
            onStateChange: (e) => { if (e?.data === window.YT.PlayerState.ENDED) next(); }
          }
        });
      } else if (iframeProvider === 'soundcloud') {
        await ensureSCAPI();
        if (!window.SC || !window.SC.Widget) return;
        scWidget = window.SC.Widget(iframeEl);
        scWidget.bind('finish', () => next());
        scWidget.bind('ready', () => { if (state.playing) scWidget.play(); });
      } else if (iframeProvider === 'vimeo') {
        await ensureVimeoAPI();
        if (!window.Vimeo || !window.Vimeo.Player) return;
        if (vimeoPlayer) { try { vimeoPlayer.unload(); } catch {} vimeoPlayer = null; }
        vimeoPlayer = new window.Vimeo.Player(iframeEl);
        vimeoPlayer.on('ended', () => next());
        if (state.playing) vimeoPlayer.play().catch(() => {});
      }
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
        "fixed inset-y-20 right-4 z-40 w-[24rem] hidden lg:flex animate-in"
      )}
    >
      {#if parseTrackUrl(current.url)?.provider === 'file'}
        <div class="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-purple-500/10 aspect-video border-2 border-primary/20 shadow-lg">
          <audio bind:this={audio} onended={next} controls class="w-full h-full"></audio>
        </div>
      {:else if iframeSrc}
        <div class="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-purple-500/10 aspect-video border-2 border-primary/20 shadow-lg">
          <iframe
            bind:this={iframeEl}
            src={iframeSrc}
            title="Embedded player"
            allow="autoplay; encrypted-media"
            allowfullscreen
            class="w-full h-full"
            onload={onIframeLoad}
          ></iframe>
        </div>
      {/if}
      <div class="space-y-4 flex-1 flex flex-col">
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
        "fixed inset-y-0 right-0 z-50 w-full max-w-md bg-gradient-to-b from-background to-muted/20 backdrop-blur-xl shadow-2xl border-l-2 border-primary/20 p-4 flex flex-col gap-4 transition-transform lg:hidden pointer-events-auto",
        mobilePanelOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-primary uppercase font-semibold tracking-wider">{t('player.queue')}</p>
          <p class="text-sm text-muted-foreground">{queueCount} {queueCount === 1 ? 'track' : 'tracks'}</p>
        </div>
        <Button variant="ghost" size="icon" onclick={() => { mobilePanelOpen = false; }}>
          <X class="h-5 w-5" />
        </Button>
      </div>
      <div class="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-purple-500/10 aspect-video border-2 border-primary/20 shadow-lg">
        {#if parseTrackUrl(current.url)?.provider === 'file'}
          <audio bind:this={audio} onended={next} controls class="w-full h-full"></audio>
        {:else if iframeSrc}
          <iframe
            bind:this={iframeEl}
            src={iframeSrc}
            title="Embedded player"
            allow="autoplay; encrypted-media"
            allowfullscreen
            class="w-full h-full"
            onload={onIframeLoad}
          ></iframe>
        {/if}
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

    <div class="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div class="pointer-events-auto border-t-2 border-primary/20 bg-gradient-to-t from-background via-background/98 to-background/95 backdrop-blur-xl px-6 py-4 shadow-2xl">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-4 min-w-0 flex-1">
            <div class="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-primary-foreground shadow-lg">
              <ListMusic class="h-6 w-6" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <p class="text-base font-bold truncate flex-1">{current.title || t('trackItem.untitled')}</p>
                <div class="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" class="h-8 w-8" onclick={openCurrentUrl} aria-label={t('player.openExternal')}>
                    <ExternalLink class="h-4 w-4" />
                  </Button>
                  {#if discogsUrl}
                    <Button variant="ghost" size="icon" class="h-8 w-8" href={discogsUrl} target="_blank" rel="noopener" aria-label="Open Discogs">
                      <DiscIcon class="h-4 w-4" />
                    </Button>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                {#if currentHandle}
                  <a href={resolve(`/@${encodeURIComponent(currentHandle)}`)} class="hover:underline hover:text-primary transition-colors">
                    @{currentHandle}
                  </a>
                {/if}
                <span>•</span>
                <span>{queueCount} {queueCount === 1 ? 'track' : 'tracks'}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <Button variant="outline" size="icon" class="h-10 w-10" onclick={shuffle} aria-label="Shuffle">
                <Shuffle class="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" class="h-10 w-10" onclick={prev} aria-label={t('player.previous')}>
                <SkipBack class="h-4 w-4" />
              </Button>
              <Button size="icon" class="h-12 w-12 shadow-lg bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90" onclick={toggle} aria-label={t('player.toggle')}>
                {#if state.playing}
                  <Pause class="h-5 w-5" />
                {:else}
                  <Play class="h-5 w-5" />
                {/if}
              </Button>
              <Button variant="outline" size="icon" class="h-10 w-10" onclick={next} aria-label={t('player.next')}>
                <SkipForward class="h-4 w-4" />
              </Button>
            </div>
            <Button class="lg:hidden shadow-md" size="sm" onclick={() => { mobilePanelOpen = true; }}>
              <LayoutList class="h-4 w-4 mr-2" />
              {t('player.queue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
