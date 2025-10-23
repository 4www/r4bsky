<script>
  import { getTrackByUri, resolveHandle, getHandleByDid } from '../../libs/r4-service.js'
  import TrackItem from '../components/TrackItem.svelte'
  import FollowButton from '../components/FollowButton.svelte'
  import { session } from '../state/session.js'
  const props = $props()
  const repo = $derived(props.repo || '')
  const handle = $derived(props.handle || '')
  const rkey = $derived(props.rkey || '')
  let item = $state(null)
  let did = $state('')
  let status = $state('')
  let displayHandle = $state('')
  const context = $derived({ type: 'detail', key: rkey, handle: displayHandle || undefined })
  const editable = $derived((($session?.did && did && $session.did === did) ? true : false))

  async function loadByUri(uri) {
    status = 'Loading…'
    try {
      const rec = await getTrackByUri(uri)
      item = { ...rec }
      status = ''
    } catch (e) {
      status = 'Error loading track'
    }
  }

  $effect(() => {
    if (!rkey) return
    if (repo) {
      did = repo
      ;(async () => {
        // Resolve handle for header from DID, non-fatal if it fails
        try { displayHandle = await getHandleByDid(did) || '' } catch {}
      })()
      const uri = `at://${repo}/com.radio4000.track/${rkey}`
      loadByUri(uri)
      return
    }
    if (handle) {
      ;(async () => {
        status = 'Loading…'
        try {
          did = await resolveHandle(handle)
          displayHandle = handle
          const uri = `at://${did}/com.radio4000.track/${rkey}`
          await loadByUri(uri)
        } catch (e) {
          status = 'Error resolving handle'
        }
      })()
    }
  })
</script>

{#if displayHandle}
  <header>
    <div>
      <strong><a href={`#/@${encodeURIComponent(displayHandle)}`}>@{displayHandle}</a></strong>
    </div>
    {#if did}
      <FollowButton actorDid={did} />
    {/if}
  </header>
{/if}

{#if status && !item}
  <div>{status}</div>
{/if}

{#if item}
  <TrackItem item={item} index={0} items={[item]} {context} {editable} />
{/if}
