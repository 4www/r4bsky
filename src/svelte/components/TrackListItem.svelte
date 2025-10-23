<script>
  import { parseTrackUrl } from '../../libs/url-patterns.js'
  import { deleteTrackByUri } from '../../libs/r4-service.js'
  import { setPlaylist } from '../player/store.js'
  import { session } from '../state/session.js'
  import { buildEditHash, buildViewHash } from '../../libs/track-uri.js'
  import { createEventDispatcher } from 'svelte'
  import Button from '../ui/Button.svelte'
  import Card from '../ui/Card.svelte'
  import DropdownMenu from '../ui/DropdownMenu.svelte'
  const { item, index = 0, items = [], context = null, editable = false } = $props()
  let message = $state('')
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
  const safeOpenUrl = $derived.by(() => {
    try {
      const m = parseTrackUrl(item?.url || '')
      return (m && m.url) || item?.url || '#'
    } catch { return '#' }
  })

  function viewHref() {
    const authorHandle = (context && context.handle) ? context.handle : null
    return buildViewHash(authorHandle, item.uri)
  }
</script>

<Card>
  <div>
    <a href={viewHref()}>{item.title || safeOpenUrl}</a>
    <Button onclick={play}>Play</Button>
    {#if editable}
      <DropdownMenu label="Actions">
        {#if editHref()}
          <a href={editHref()}>Edit</a>
        {/if}
        <button onclick={remove}>Delete</button>
      </DropdownMenu>
    {/if}
  </div>
  {#if item.description}
    <div>{item.description}</div>
  {/if}
  {#if message}
    <div>{message}</div>
  {/if}
</Card>
