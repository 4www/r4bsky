<script>
  import { createTrack } from '../libs/r4-service.js'
  import { fetchOEmbed } from '../libs/oembed.js'
  import { parseUrl as parseDiscogsUrl, fetchDiscogs, extractSuggestions } from '../libs/discogs.js'
  let url = ''
  let title = ''
  let description = ''
  let discogs_url = ''
  let status = ''
  let savedUri = ''
  import { parseAtUri } from '../libs/track-uri.js'
  const savedAt = $derived(savedUri ? parseAtUri(savedUri) : null)

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
      const res = await createTrack({ url, title, description: fullDescription, discogs_url })
      savedUri = res?.data?.uri || res?.uri || ''
      url = ''
      title = ''
      description = ''
      discogs_url = ''
      status = 'Saved'
    } catch (err) {
      status = 'Error: ' + (err?.message || err)
    }
  }

  $effect(() => {
    if (url && !title) {
      ;(async () => {
        try {
          const data = await fetchOEmbed(url)
          if (data?.title && !title) title = data.title
        } catch (_) {}
      })()
    }
  })
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
  {#if status}
    <div>{status}
      {#if savedAt}
        <div>
          <a href={`#/t/${encodeURIComponent(savedAt.repo)}/${encodeURIComponent(savedAt.rkey)}`}>Open track</a>
        </div>
      {/if}
    </div>
  {/if}
  
</form>
