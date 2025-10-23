<script>
  import { updateTrackByUri, resolveHandle, getTrackByUri } from '../../libs/r4-service.js'
  import { session } from '../state/session.js'
  import { AtUri } from '@atproto/api'
  import Modal from '../components/Modal.svelte'
  import TrackEditForm from '../components/TrackEditForm.svelte'
  export let repo
  export let rkey
  export let handle
  let initial = { url: '', title: '', description: '', discogs_url: '' }
  let uri = ''

  $effect(() => {
    ;(async () => {
      // build uri from either repo+rkey or handle+rkey
      let didOrRepo = repo
      if (!didOrRepo && handle) {
        try { didOrRepo = await resolveHandle(handle) } catch {}
      }
      if (didOrRepo && rkey) {
        uri = `at://${didOrRepo}/com.radio4000.track/${rkey}`
      }
    })()
  })

  $effect(() => {
    if (!uri) return
    ;(async () => {
      try {
        const rec = await getTrackByUri(uri)
        initial = { url: rec.url || '', title: rec.title || '', description: rec.description || '', discogs_url: rec.discogsUrl || '' }
      } catch (_) {}
    })()
  })

  // Prefill form from URL query params (optional) or leave empty; in a full app we'd fetch the record
  function close() {
    const h = handle || $session?.handle || ''
    const back = h ? `#/@${encodeURIComponent(h)}` : '#/'
    location.hash = back
  }
</script>

<svelte:component this={Modal} title="Edit Track" onClose={close}>
  <svelte:component this={TrackEditForm} uri={uri} initial={initial} />
</svelte:component>
