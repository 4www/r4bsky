<script>
  import { updateTrackByUri } from '../../libs/r4-service.js'
  export let uri = ''
  export let initial = { url: '', title: '', description: '' }
  let url = initial.url || ''
  let title = initial.title || ''
  let description = initial.description || ''
  let status = ''

  async function save(e) {
    e.preventDefault()
    status = ''
    try {
      await updateTrackByUri(uri, { url, title, description })
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
  <button type="submit">Save</button>
  {#if status}<div>{status}</div>{/if}
</form>

