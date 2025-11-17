<script lang="ts">
  import { onMount } from 'svelte'
  import { updateTrackByUri, resolveHandle, getTrackByUri } from '$lib/services/r4-service'
  import { session } from '$lib/state/session'
  import { Dialog } from '$lib/components/ui/dialog/index'
  import TrackEditForm from '$lib/components/TrackEditForm.svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { locale, translate } from '$lib/i18n'
  const { repo, rkey, handle: _handle } = $props();
  // Strip @ symbol if present (from URL like /@handle)
  const handle = _handle ? _handle.replace(/^@/, '') : ''
  let initial = $state({ url: '', title: '', description: '', discogs_url: '' })
  let uri = $state('')
  const t = (key, vars = {}) => translate($locale, key, vars)

  onMount(() => {
    ;(async () => {
      let didOrRepo = repo
      if (!didOrRepo && handle) {
        try { didOrRepo = await resolveHandle(handle) } catch {}
      }
      if (didOrRepo && rkey) {
        const nextUri = `at://${didOrRepo}/com.radio4000.track/${rkey}`
        uri = nextUri
        try {
          const rec = await getTrackByUri(nextUri)
          initial = { url: rec.url || '', title: rec.title || '', description: rec.description || '', discogs_url: rec.discogsUrl || '' }
        } catch (_) {}
      }
    })()
  })

  // Prefill form from URL query params (optional) or leave empty; in a full app we'd fetch the record
  function close() {
    const h = handle || $session?.handle || ''
    const back = h ? `/@${encodeURIComponent(h)}` : '/'
    goto(resolve(back))
  }
</script>

<Dialog title={t('editTrack.title')} onClose={close}>
  <TrackEditForm uri={uri} initial={initial} />
</Dialog>
