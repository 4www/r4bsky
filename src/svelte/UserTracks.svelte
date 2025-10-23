<script>
  import { onMount } from 'svelte'
  import { getMyDid, listTracksByDid } from '../libs/r4-service.js'
  import { parseTrackUrl } from '../libs/url-patterns.js'
  import TrackList from './components/TrackList.svelte'
  let items = $state([])
  let cursor = $state(undefined)
  let error = $state('')

  async function load() {
    try {
      const did = await getMyDid()
      const res = await listTracksByDid(did)
      items = res.tracks
      cursor = res.cursor
    } catch (e) {
      error = e?.message || String(e)
    }
  }

  async function more() {
    if (!cursor) return
    const did = await getMyDid()
    const res = await listTracksByDid(did, { cursor })
    items = [...items, ...res.tracks]
    cursor = res.cursor
  }

  onMount(load)
</script>

{#if error}
  <div>Failed to load tracks: {error}</div>
{:else}
  <TrackList {items} editable={true} onremoved={(e) => { items = items.filter((t) => t.uri !== e.detail.uri) }} />
  {#if cursor}
    <button onclick={more}>Load more</button>
  {/if}
{/if}
