<script>
  import { createTrack } from '../libs/r4-service.js'
  import { fetchOEmbed } from '../libs/oembed.js'
  import { parseUrl as parseDiscogsUrl, fetchDiscogs, extractSuggestions } from '../libs/discogs.js'
  let url = ''
  let title = ''
  let description = ''
  let discogs_url = ''
  let status = ''

  async function submit(e) {
    e.preventDefault()
    status = ''
    try {
      let fullDescription = description
      if (discogs_url) {
        try {
          const info = parseDiscogsUrl(discogs_url)
          if (info?.id && info?.type) {
            const data = await fetchDiscogs(info)
            const tags = extractSuggestions(data)
            if (tags?.length) fullDescription = [description, tags.map((t) => `#${t}`).join(' ')].join(' ').trim()
          }
        } catch (_) {}
      }
      await createTrack({ url, title, description: fullDescription, discogs_url })
      url = ''
      title = ''
      description = ''
      discogs_url = ''
      status = 'Saved'
    } catch (err) {
      status = 'Error: ' + (err?.message || err)
    }
  }

  $: (async () => {
    if (url && !title) {
      try {
        const data = await fetchOEmbed(url)
        if (data?.title && !title) title = data.title
      } catch (_) {}
    }
  })()
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
  <label>
    Discogs URL (optional)
    <input type="url" bind:value={discogs_url} placeholder="https://www.discogs.com/release/..." />
  </label>
  <button type="submit">Save</button>
  {#if status}<div>{status}</div>{/if}
  
</form>
