<script>
  import { updateTrackByUri } from '../../libs/r4-service.js'
  export let uri = ''
  export let initial = { url: '', title: '', description: '', discogs_url: '' }
  let url = initial.url || ''
  let title = initial.title || ''
  let description = initial.description || ''
  let discogs_url = initial.discogs_url || initial.discogsUrl || ''
  let status = ''
  let prefilled = false

  // Prefill once when initial arrives (from async load)
  $effect(() => {
    if (!prefilled && initial && (initial.url || initial.title || initial.description || initial.discogs_url || initial.discogsUrl)) {
      url = initial.url || ''
      title = initial.title || ''
      description = initial.description || ''
      discogs_url = initial.discogs_url || initial.discogsUrl || ''
      prefilled = true
    }
  })

  async function save(e) {
    e.preventDefault()
    status = ''
    try {
      await updateTrackByUri(uri, { url, title, description, discogsUrl: discogs_url || undefined })
      status = 'Saved'
      const ev = new CustomEvent('saved', { detail: { uri } })
      dispatchEvent(ev)
    } catch (e) {
      status = e?.message || String(e)
    }
  }
</script>

<form on:submit={save}>
  <label>URL <input type="url" bind:value={url} required /></label>
  <label>Title <input type="text" bind:value={title} required /></label>
  <label>Description <textarea bind:value={description}></textarea></label>
  <label>Discogs URL (optional) <input type="url" bind:value={discogs_url} /></label>
  <button type="submit">Save</button>
  {#if status}<div>{status}</div>{/if}
</form>
