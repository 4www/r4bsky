<script>
  import { resolveHandle, listTracksByDid } from '../../libs/r4-service.js'
  import FollowButton from '../components/FollowButton.svelte'
  import TrackList from '../components/TrackList.svelte'
  import { session } from '../state/session.js'
  const { handle: _handle } = $props()
  let handle = $state(_handle || '')
  let did = $state('')
  let items = $state([])
  let cursor = $state(undefined)
  let status = $state('')
  const context = $derived(did ? { type: 'author', key: did, handle } : { type: 'author', key: handle || '' })

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

  // Prefill from route param or URL hash query
  import { onMount } from 'svelte'
  import { setPlaylist } from '../player/store.js'
  function playAll(fromIdx) {
    setPlaylist(items, fromIdx)
  }
  onMount(() => {
    if (handle) {
      loadAuthor()
      return
    }
    const hash = location.hash
    const i = hash.indexOf('?')
    if (i !== -1) {
      const q = new URLSearchParams(hash.slice(i + 1))
      const h = q.get('handle')
      if (h) { handle = h; loadAuthor() }
    }
  })
</script>

{#if handle}
  <header>
    <div><strong>@{handle}</strong></div>
    {#if did}
      <FollowButton actorDid={did} />
    {/if}
  </header>
{/if}
{#if !handle}
  <form onsubmit={loadAuthor}>
    <fieldset>
      <legend><label for="author-handle">Handle</label></legend>
      <input id="author-handle" name="handle" type="text" bind:value={handle} placeholder="alice.bsky.social" required />
    </fieldset>
    <fieldset>
      <button type="submit">Load</button>
    </fieldset>
  </form>
{/if}
{#if status}<div>{status}</div>{/if}
{#if items.length}
  <TrackList {items} {context} editable={($session?.did && did && $session.did === did) || false} onremoved={(e) => { items = items.filter((t) => t.uri !== e.detail.uri) }} />
  {#if cursor}
    <button onclick={more}>Load more</button>
  {/if}
{/if}
