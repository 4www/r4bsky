<script>
  import { onMount } from 'svelte'
  import { getMyDid, listTracksByDid } from '../libs/r4-service.js'
  import { parseTrackUrl } from '../libs/url-patterns.js'
  import TrackList from './components/TrackList.svelte'
  let items = []
  let cursor = undefined
  let error = ''

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
  <svelte:component this={TrackList} {items} editable={true} />
  {#if cursor}
    <button on:click={more}>Load more</button>
  {/if}
{/if}
