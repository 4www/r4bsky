<script>
  import { updateTrackByUri } from '../../libs/r4-service.js'
  import { AtUri } from '@atproto/api'
  export let repo
  export let rkey
  let url = ''
  let title = ''
  let description = ''
  let status = ''
  $: at = `at://${repo}/com.radio4000.track/${rkey}`
  async function save(e) {
    e.preventDefault()
    status = ''
    try {
      await updateTrackByUri(at, { url, title, description })
      status = 'Saved'
    } catch (e) {
      status = e?.message || String(e)
    }
  }
</script>

<h2>Edit Track</h2>
<form on:submit={save}>
  <label>URL <input type="url" bind:value={url} required /></label>
  <label>Title <input type="text" bind:value={title} required /></label>
  <label>Description <textarea bind:value={description}></textarea></label>
  <button type="submit">Save</button>
  {#if status}<div>{status}</div>{/if}
</form>

