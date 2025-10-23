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

  function onIframeLoad() {
    // Subscribe to finish events for providers that support postMessage APIs
    try {
      const win = iframeEl?.contentWindow
      if (!win) return
      if (iframeProvider === 'vimeo') {
        // Older Vimeo API
        win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'finish' }), '*')
        // Newer event name
        win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'ended' }), '*')
      } else if (iframeProvider === 'soundcloud') {
        win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'finish' }), '*')
      } else if (iframeProvider === 'youtube') {
        // YouTube posts onStateChange automatically when enablejsapi=1
      }
    } catch {}
  }

  function onMessage(e) {
    try {
      const origin = e.origin || ''
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
      // YouTube: event onStateChange with info 0 means ended
      if ((/youtube\.com$/i.test(new URL(iframeSrc || 'about:blank').hostname) || origin.includes('youtube')) && data?.event === 'onStateChange' && (data?.info === 0 || data?.data === 0)) {
        next()
        return
      }
      // Vimeo: event 'finish' or 'ended'
      if (origin.includes('vimeo.com') && (data?.event === 'finish' || data?.event === 'ended')) {
        next()
        return
      }
      // SoundCloud: event 'finish'
      if (origin.includes('soundcloud.com')) {
        if (data?.event === 'finish' || data?.method === 'finish') { next(); return }
      }
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
