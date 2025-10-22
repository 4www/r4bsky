<script>
  import { resolveHandle, listTracksByDid } from '../../libs/r4-service.js'
  import { parseTrackUrl } from '../../libs/url-patterns.js'
  let handle = ''
  let did = ''
  let items = []
  let cursor = undefined
  let status = ''

  async function loadAuthor(e) {
    e?.preventDefault()
    status = 'Loading…'
    try {
      did = await resolveHandle(handle)
      const {tracks, cursor: c} = await listTracksByDid(did)
      items = tracks
      cursor = c
      status = ''
    } catch (err) {
      status = 'Error: ' + (err?.message || err)
    }
  }

  async function more() {
    if (!cursor) return
    const {tracks, cursor: c} = await listTracksByDid(did, {cursor})
    items = [...items, ...tracks]
    cursor = c
  }
</script>

<h2>Author Tracks</h2>
<form on:submit={loadAuthor}>
  <input type="text" bind:value={handle} placeholder="alice.bsky.social" required />
  <button type="submit">Load</button>
</form>
{#if status}<div>{status}</div>{/if}
{#if items.length}
  <ul>
    {#each items as t}
      {#if parseTrackUrl(t.url)}
        <li><a href={parseTrackUrl(t.url).url} target="_blank">{t.title || parseTrackUrl(t.url).url}</a></li>
      {/if}
    {/each}
  </ul>
  {#if cursor}
    <button on:click={more}>Load more</button>
  {/if}
{/if}

