<script>
  import { onMount } from 'svelte'
  import { player, toggle, next, prev } from '../player/store.js'
  import { parseTrackUrl, buildEmbedUrl } from '../../libs/url-patterns.js'
  let state = { playlist: [], index: -1, playing: false }
  let current = null
  let audio
  let iframeSrc = ''

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
      } else {
        if (audio) {
          audio.pause()
          audio.removeAttribute('src')
        }
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
        src={iframeSrc}
        title="Embedded player"
        allow="autoplay; encrypted-media"
        allowfullscreen
        width="560"
        height="315"
      ></iframe>
    {/if}
  </section>
{/if}
