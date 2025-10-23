<script>
  import { parseTrackUrl } from '../../libs/url-patterns.js'
  import { deleteTrackByUri } from '../../libs/r4-service.js'
  import { setPlaylist } from '../player/store.js'
  import { session } from '../state/session.js'
  import { buildEditHash } from '../../libs/track-uri.js'
  import { createEventDispatcher } from 'svelte'
  import Button from '../ui/Button.svelte'
  import Card from '../ui/Card.svelte'
  import DropdownMenu from '../ui/DropdownMenu.svelte'
  const { item, index = 0, items = [], context = null, editable = false } = $props()
  let message = ''
  const dispatch = createEventDispatcher()

  function play() { setPlaylist(items && items.length ? items : [item], items && items.length ? index : 0, context) }

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
  <svelte:component this={Card}>
    <div>
      <a href={parseTrackUrl(item.url).url} target="_blank">{item.title || parseTrackUrl(item.url).url}</a>
      <svelte:component this={Button} on:click={play}>Play</svelte:component>
      {#if editable}
        <svelte:component this={DropdownMenu} label="Actions">
          {#if editHref()}
            <a href={editHref()}>Edit</a>
          {/if}
          <button on:click={remove}>Delete</button>
        </svelte:component>
      {/if}
    </div>
    {#if item.description}
      <div>{item.description}</div>
    {/if}
    {#if message}
      <div>{message}</div>
    {/if}
  </svelte:component>
{/if}
