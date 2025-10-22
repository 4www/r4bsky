<script>
  import { onMount } from 'svelte'
  import { getMyDid, listTracksByDid } from '../libs/r4-service.js'
  import { parseTrackUrl } from '../libs/url-patterns.js'
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
  <ul>
    {#each items as t}
      {#if parseTrackUrl(t.url)}
        <li>
          <a href={parseTrackUrl(t.url).url} target="_blank">{t.title || parseTrackUrl(t.url).url}</a>
        </li>
      {/if}
    {/each}
  </ul>
  {#if cursor}
    <button on:click={more}>Load more</button>
  {/if}
{/if}

