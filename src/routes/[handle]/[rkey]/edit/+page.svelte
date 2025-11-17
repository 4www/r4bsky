<script lang="ts">
  import { updateTrackByUri, resolveHandle, getTrackByUri } from '$lib/services/r4-service'
  import { session } from '$lib/state/session'
  import { Dialog } from '$lib/components/ui/dialog/index'
  import TrackEditForm from '$lib/components/TrackEditForm.svelte'
  const { repo, rkey, handle: _handle } = $props();
  // Strip @ symbol if present (from URL like /@handle)
  const handle = _handle ? _handle.replace(/^@/, '') : ''
  let initial = $state({ url: '', title: '', description: '', discogs_url: '' })
  let uri = $state('')

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

<Dialog title="Edit Track" onClose={close}>
  <TrackEditForm uri={uri} initial={initial} />
</Dialog>
