<script>
  import { onMount } from 'svelte'
  import { player, toggle, next, prev } from '../player/store.js'
  import { parseTrackUrl } from '../../libs/url-patterns.js'
  let state = { playlist: [], index: -1, playing: false }
  let current = null
  let audio

  const unsub = player.subscribe((s) => {
    state = s
    current = s.playlist?.[s.index] || null
    if (audio && current) {
      const meta = parseTrackUrl(current.url)
      if (meta?.provider === 'file') {
        audio.src = meta.url
        if (s.playing) audio.play().catch(() => {})
        else audio.pause()
      } else {
        audio.pause()
        audio.removeAttribute('src')
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
      {#if parseTrackUrl(current.url)?.provider !== 'file'}
        <a href={parseTrackUrl(current.url).url} target="_blank">Open</a>
      {/if}
    </div>
    <audio bind:this={audio} on:ended={next} on:play={opened}></audio>
  </section>
{/if}
