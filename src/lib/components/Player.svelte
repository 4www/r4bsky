<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { player, toggle, next, prev } from '$lib/player/store';
  import { parseTrackUrl, buildEmbedUrl } from '$lib/services/url-patterns';
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import { Play, Pause, SkipForward, SkipBack, ExternalLink } from 'lucide-svelte';

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

  function opened() {
    // noop placeholder for future
  }

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

  function onMessage(e) {
    try {
      const origin = e.origin || '';
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if ((/youtube\.com$/i.test(new URL(iframeSrc || 'about:blank').hostname) || origin.includes('youtube')) && data?.event === 'onStateChange' && (data?.info === 0 || data?.data === 0)) return next();
      if (origin.includes('vimeo.com') && (data?.event === 'finish' || data?.event === 'ended')) return next();
      if (origin.includes('soundcloud.com')) { if (data?.event === 'finish' || data?.method === 'finish') return next(); }
    } catch {}
  }

  onMount(() => {
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });
</script>

{#if current}
  <div class="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
    <div class="container py-4">
      <div class="flex flex-col gap-4">
        <!-- Track Info and Controls -->
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-sm truncate">{current.title}</h3>
            {#if current.description}
              <p class="text-xs text-muted-foreground truncate">{current.description}</p>
            {/if}
          </div>

          <div class="flex items-center gap-2">
            <Button variant="outline" size="icon" onclick={prev}>
              <SkipBack class="h-4 w-4" />
            </Button>
            <Button size="icon" onclick={toggle}>
              {#if state.playing}
                <Pause class="h-4 w-4" />
              {:else}
                <Play class="h-4 w-4" />
              {/if}
            </Button>
            <Button variant="outline" size="icon" onclick={next}>
              <SkipForward class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={(parseTrackUrl(current?.url || '')?.url) || (current?.url || '#')} target="_blank">
                <ExternalLink class="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        <!-- Player Embed -->
        {#if parseTrackUrl(current.url)?.provider === 'file'}
          <audio bind:this={audio} onended={next} onplay={opened} controls class="w-full"></audio>
        {:else if iframeSrc}
          <div class="aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden bg-muted">
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
      </div>
    </div>
  </div>
{/if}
