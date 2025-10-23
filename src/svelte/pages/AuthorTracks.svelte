<script>
  import { resolveHandle, listTracksByDid } from '../../libs/r4-service.js'
  import FollowButton from '../components/FollowButton.svelte'
  import TrackList from '../components/TrackList.svelte'
  import { session } from '../state/session.js'
  export let handle = ''
  let did = ''
  let items = []
  let cursor = undefined
  let status = ''
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

<h2>Author Tracks</h2>
{#if !handle}
  <form on:submit={loadAuthor}>
    <input type="text" bind:value={handle} placeholder="alice.bsky.social" required />
    <button type="submit">Load</button>
  </form>
{/if}
{#if status}<div>{status}</div>{/if}
{#if items.length}
  <svelte:component this={TrackList} {items} {context} editable={($session?.did && did && $session.did === did) || false} />
  {#if did}
    <FollowButton actorDid={did} />
  {/if}
  {#if cursor}
    <button on:click={more}>Load more</button>
  {/if}
{/if}
