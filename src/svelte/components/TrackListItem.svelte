<script>
  import { parseTrackUrl } from '../../libs/url-patterns.js'
  import { deleteTrackByUri } from '../../libs/r4-service.js'
  import { setPlaylist } from '../player/store.js'
  import { session } from '../state/session.js'
  import { buildEditHash } from '../../libs/track-uri.js'
  import { createEventDispatcher } from 'svelte'
  export let item // { uri, title, url, description }
  export let index = 0
  export let items = [] // full context list, used for playlist
  export let editable = false
  let message = ''
  const dispatch = createEventDispatcher()

  function play() { setPlaylist(items && items.length ? items : [item], items && items.length ? index : 0) }

  async function remove() {
    message = ''
    try {
      await deleteTrackByUri(item.uri)
      dispatch('remove', { uri: item.uri })
    } catch (e) {
      message = e?.message || String(e)
    }
  }

  function editHref() {
    const handle = $session?.handle
    return buildEditHash(handle, item.uri)
  }
</script>

{#if parseTrackUrl(item.url)}
  <div>
    <div>
      <a href={parseTrackUrl(item.url).url} target="_blank">{item.title || parseTrackUrl(item.url).url}</a>
      <button on:click={play}>Play</button>
      {#if editable}
        {#if editHref()}
          <a href={editHref()}>Edit</a>
        {/if}
        <button on:click={remove}>Delete</button>
      {/if}
    </div>
    {#if item.description}
      <div>{item.description}</div>
    {/if}
    {#if message}
      <div>{message}</div>
    {/if}
  </div>
{/if}
