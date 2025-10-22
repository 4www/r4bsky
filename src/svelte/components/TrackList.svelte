<script>
  import { parseTrackUrl } from '../../libs/url-patterns.js'
  import { deleteTrackByUri, updateTrackByUri } from '../../libs/r4-service.js'
  import { setPlaylist, playIndex } from '../player/store.js'
  export let items = [] // [{ uri, title, url, description }]
  export let editable = false
  let message = ''

  async function remove(uri) {
    message = ''
    try {
      await deleteTrackByUri(uri)
      items = items.filter((t) => t.uri !== uri)
    } catch (e) {
      message = e?.message || String(e)
    }
  }

  async function save(uri, idx) {
    message = ''
    const t = items[idx]
    try {
      await updateTrackByUri(uri, { url: t.url, title: t.title, description: t.description })
      message = 'Saved'
    } catch (e) {
      message = e?.message || String(e)
    }
  }

  function playAll(fromIdx) {
    setPlaylist(items, fromIdx)
  }
</script>

{#if message}<div>{message}</div>{/if}
<ul>
  {#each items as t, i}
    {#if parseTrackUrl(t.url)}
      <li>
        {#if editable}
          <input type="text" bind:value={t.title} placeholder="Title" />
          <input type="url" bind:value={t.url} placeholder="URL" />
          <textarea bind:value={t.description} placeholder="Description"></textarea>
          <button on:click={() => save(t.uri, i)}>Save</button>
          <button on:click={() => remove(t.uri)}>Delete</button>
        {:else}
          <a href={parseTrackUrl(t.url).url} target="_blank">{t.title || parseTrackUrl(t.url).url}</a>
          <button on:click={() => playAll(i)}>Play</button>
        {/if}
      </li>
    {/if}
  {/each}
  {#if !items?.length}
    <li>No tracks</li>
  {/if}
</ul>
