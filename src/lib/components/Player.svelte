<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { player, toggle, next, prev, playIndex } from '$lib/player/store';
  import { parseTrackUrl, buildEmbedUrl } from '$lib/services/url-patterns';
  import { Button } from '$lib/components/ui/button';
  import { Play, Pause, SkipForward, SkipBack, ExternalLink, ArrowUpRight, Disc as DiscIcon, ListMusic, X, LayoutList } from 'lucide-svelte';
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
        "pointer-events-auto flex flex-col gap-4 border bg-card/95 shadow-2xl backdrop-blur rounded-2xl p-4 transition-transform",
        "fixed inset-y-20 right-4 z-40 w-[22rem] hidden lg:flex"
      )}
    >
      {#if parseTrackUrl(current.url)?.provider === 'file'}
        <div class="rounded-xl overflow-hidden bg-muted aspect-video">
          <audio bind:this={audio} onended={next} controls class="w-full h-full"></audio>
        </div>
      {:else if iframeSrc}
        <div class="rounded-xl overflow-hidden bg-muted aspect-video">
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
      <div class="space-y-3 flex-1 flex flex-col">
        <div>
          <p class="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <ListMusic class="h-3.5 w-3.5" />
            {t('player.queue')}
          </p>
          <p class="text-sm text-muted-foreground">{queueCount} tracks</p>
        </div>
        <div class="flex-1 overflow-y-auto rounded-xl border divide-y">
          {#each state.playlist as track, idx}
            <button
              type="button"
              class={cn(
                "w-full text-left px-3 py-3 transition flex flex-col gap-1",
                idx === state.index ? "bg-primary/10 text-primary" : "hover:bg-muted/80"
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
        "fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card/98 shadow-2xl border-l p-4 flex flex-col gap-4 transition-transform lg:hidden pointer-events-auto",
        mobilePanelOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-muted-foreground uppercase">{t('player.queue')}</p>
          <p class="text-sm text-muted-foreground">{queueCount} tracks</p>
        </div>
        <Button variant="ghost" size="icon" onclick={() => { mobilePanelOpen = false; }}>
          <X class="h-4 w-4" />
        </Button>
      </div>
      <div class="rounded-xl overflow-hidden bg-muted aspect-video">
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
      <div class="flex-1 overflow-y-auto rounded-xl border divide-y">
        {#each state.playlist as track, idx}
          <button
            type="button"
            class={cn(
              "w-full text-left px-3 py-3 transition flex flex-col gap-1",
              idx === state.index ? "bg-primary/10 text-primary" : "hover:bg-muted/80"
            )}
            onclick={() => { playIndex(idx); mobilePanelOpen = false; }}
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
      <div class="pointer-events-auto border-t bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <div class="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ListMusic class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">{current.title || t('trackItem.untitled')}</p>
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                {#if currentHandle}
                  <a href={resolve(`/@${encodeURIComponent(currentHandle)}`)} class="hover:underline">
                    @{currentHandle}
                  </a>
                {/if}
                <span>•</span>
                <span>{queueCount} {queueCount === 1 ? 'track' : 'tracks'}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="icon" onclick={prev} aria-label={t('player.previous')}>
              <SkipBack class="h-4 w-4" />
            </Button>
            <Button size="icon" onclick={toggle} aria-label={t('player.toggle')}>
              {#if state.playing}
                <Pause class="h-5 w-5" />
              {:else}
                <Play class="h-5 w-5" />
              {/if}
            </Button>
            <Button variant="outline" size="icon" onclick={next} aria-label={t('player.next')}>
              <SkipForward class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onclick={openCurrentUrl} aria-label={t('player.openExternal')}>
              <ExternalLink class="h-4 w-4" />
            </Button>
            {#if discogsUrl}
              <Button variant="ghost" size="icon" href={discogsUrl} target="_blank" rel="noopener" aria-label="Open Discogs">
                <DiscIcon class="h-4 w-4" />
              </Button>
            {/if}
            <Button variant="secondary" class="lg:hidden" size="sm" onclick={() => { mobilePanelOpen = true; }}>
              <LayoutList class="h-4 w-4 mr-2" />
              {t('player.queue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
