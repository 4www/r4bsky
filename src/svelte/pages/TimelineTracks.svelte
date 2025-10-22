<script>
  import { onMount } from 'svelte'
  import { timelineTracks } from '../../libs/r4-service.js'
  import { parseTrackUrl } from '../../libs/url-patterns.js'
  import { setPlaylist } from '../player/store.js'
  let items = []
  let error = ''
  onMount(async () => {
    try {
      items = await timelineTracks({limitPerActor: 5})
    } catch (e) {
      error = e?.message || String(e)
    }
  })
  function playAll(fromIdx) { setPlaylist(items, fromIdx) }
</script>

<h2>Timeline</h2>
{#if error}
  <div>Failed to load: {error}</div>
{:else}
  <ul>
    {#each items as t, i}
      {#if parseTrackUrl(t.url)}
        <li>
          <a href={parseTrackUrl(t.url).url} target="_blank">{t.title || parseTrackUrl(t.url).url}</a>
          <button on:click={() => playAll(i)}>Play</button>
          <small> — {t.authorDid}</small>
        </li>
      {/if}
    {/each}
  </ul>
{/if}
