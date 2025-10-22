<script>
  import { createTrack } from '../libs/r4-service.js'
  let url = ''
  let title = ''
  let description = ''
  let status = ''

  async function submit(e) {
    e.preventDefault()
    status = ''
    try {
      await createTrack({ url, title, description })
      url = ''
      title = ''
      description = ''
      status = 'Saved'
    } catch (err) {
      status = 'Error: ' + (err?.message || err)
    }
  }
</script>

<form on:submit={submit}>
  <label>
    URL
    <input type="url" bind:value={url} required placeholder="https://youtube.com/watch?v=..." />
  </label>
  <label>
    Title
    <input type="text" bind:value={title} required placeholder="Artist - Song" />
  </label>
  <label>
    Description (optional)
    <textarea bind:value={description} placeholder="Add context..."></textarea>
  </label>
  <button type="submit">Save</button>
  {#if status}<div>{status}</div>{/if}
  
</form>

