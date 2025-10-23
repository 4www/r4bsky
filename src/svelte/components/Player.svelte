<script>
  import { onMount } from 'svelte'
  import { player, toggle, next, prev } from '../player/store.js'
  import { parseTrackUrl, buildEmbedUrl } from '../../libs/url-patterns.js'
  let state = { playlist: [], index: -1, playing: false }
  let current = null
  let audio
  let iframeSrc = ''
  let iframeEl
  let iframeProvider = ''
  let ytPlayer = null
  let scWidget = null
  let vimeoPlayer = null
  let ytApiReady = null
  let scApiReady = null
  let vimeoApiReady = null

  function loadScriptOnce(src, check) {
    return new Promise((resolve, reject) => {
      try {
        if (check && check()) return resolve()
        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.onload = () => resolve()
        s.onerror = (e) => reject(new Error('Failed to load ' + src))
        document.head.appendChild(s)
      } catch (e) { reject(e) }
    })
  }

  function ensureYouTubeAPI() {
    if (!ytApiReady) {
      ytApiReady = new Promise((resolve) => {
        const onReady = () => resolve()
        if (window.YT && window.YT.Player) return resolve()
        window.onYouTubeIframeAPIReady = onReady
        loadScriptOnce('https://www.youtube.com/iframe_api', () => window.YT && window.YT.Player).then(() => {
          if (window.YT && window.YT.Player) resolve()
        }).catch(() => resolve())
      })
    }
    return ytApiReady
  }

  function ensureSCAPI() {
    if (!scApiReady) {
      scApiReady = loadScriptOnce('https://w.soundcloud.com/player/api.js', () => window.SC && window.SC.Widget)
    }
    return scApiReady
  }

  function ensureVimeoAPI() {
    if (!vimeoApiReady) {
      vimeoApiReady = loadScriptOnce('https://player.vimeo.com/api/player.js', () => window.Vimeo && window.Vimeo.Player)
    }
    return vimeoApiReady
  }

  const unsub = player.subscribe((s) => {
    state = s
    current = s.playlist?.[s.index] || null
    if (current) {
      const meta = parseTrackUrl(current.url)
      if (meta?.provider === 'file') {
        if (audio) {
          audio.src = meta.url
          if (s.playing) audio.play().catch(() => {})
          else audio.pause()
        }
        iframeSrc = ''
        iframeProvider = ''
      } else {
        if (audio) {
          audio.pause()
          audio.removeAttribute('src')
        }
        iframeProvider = meta?.provider || ''
        iframeSrc = buildEmbedUrl(meta, { autoplay: s.playing }) || ''
      }
    }
  })

  onMount(() => () => unsub())
  function onKey(e) {
    if (!current) return
    if (e.key === ' ') { e.preventDefault(); toggle() }
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft') prev()
  }
  onMount(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  function opened() {
    // noop placeholder for future
  }

  async function onIframeLoad() {
    try {
      if (!iframeEl) return
      if (iframeProvider === 'youtube') {
        await ensureYouTubeAPI()
        if (!window.YT || !window.YT.Player) return
        if (ytPlayer) { try { ytPlayer.destroy() } catch {} ytPlayer = null }
        ytPlayer = new window.YT.Player(iframeEl, {
          events: {
            onReady: () => { if (state.playing) ytPlayer.playVideo() },
            onStateChange: (e) => { if (e?.data === window.YT.PlayerState.ENDED) next() }
          }
        })
      } else if (iframeProvider === 'soundcloud') {
        await ensureSCAPI()
        if (!window.SC || !window.SC.Widget) return
        scWidget = window.SC.Widget(iframeEl)
        scWidget.bind('finish', () => next())
        scWidget.bind('ready', () => { if (state.playing) scWidget.play() })
      } else if (iframeProvider === 'vimeo') {
        await ensureVimeoAPI()
        if (!window.Vimeo || !window.Vimeo.Player) return
        if (vimeoPlayer) { try { vimeoPlayer.unload() } catch {} vimeoPlayer = null }
        vimeoPlayer = new window.Vimeo.Player(iframeEl)
        vimeoPlayer.on('ended', () => next())
        if (state.playing) vimeoPlayer.play().catch(() => {})
      }
    } catch {}
  }

  function onMessage(e) {
    try {
      const origin = e.origin || ''
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
      // Keep YouTube fallback (rarely emitted without API)
      if ((/youtube\.com$/i.test(new URL(iframeSrc || 'about:blank').hostname) || origin.includes('youtube')) && data?.event === 'onStateChange' && (data?.info === 0 || data?.data === 0)) return next()
      // Vimeo: event 'finish' or 'ended'
      if (origin.includes('vimeo.com') && (data?.event === 'finish' || data?.event === 'ended')) return next()
      // SoundCloud: event 'finish'
      if (origin.includes('soundcloud.com')) { if (data?.event === 'finish' || data?.method === 'finish') return next() }
    } catch {}
  }
  onMount(() => {
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  })
</script>

{#if current}
  <section>
    <div>
      <strong>{current.title}</strong>
    </div>
    <div>
      <button on:click={prev}>Prev</button>
      <button on:click={toggle}>{state.playing ? 'Pause' : 'Play'}</button>
      <button on:click={next}>Next</button>
      <a href={parseTrackUrl(current.url).url} target="_blank">Open</a>
    </div>
    {#if parseTrackUrl(current.url)?.provider === 'file'}
      <audio bind:this={audio} on:ended={next} on:play={opened} controls></audio>
    {:else if iframeSrc}
      <iframe
        bind:this={iframeEl}
        src={iframeSrc}
        title="Embedded player"
        allow="autoplay; encrypted-media"
        allowfullscreen
        width="560"
        height="315"
        on:load={onIframeLoad}
      ></iframe>
    {/if}
  </section>
{/if}
