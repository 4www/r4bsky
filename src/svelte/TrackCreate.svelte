<script>
  import { createTrack } from '../libs/r4-service.js'
  import { fetchOEmbed } from '../libs/oembed.js'
  import { parseUrl as parseDiscogsUrl, fetchDiscogs, extractSuggestions } from '../libs/discogs.js'
  import TrackForm from './components/TrackForm.svelte'
  import { parseAtUri } from '../libs/track-uri.js'
  let savedUri = $state('')
  const savedAt = $derived(savedUri ? parseAtUri(savedUri) : null)

  async function onCreate({ url, title, description, discogs_url }) {
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
    return res
  }
</script>

<TrackForm submitLabel="Save" onSubmit={onCreate} />
  {#if savedAt}
    <div>
      <a href={`#/${encodeURIComponent(savedAt.repo)}/${encodeURIComponent(savedAt.rkey)}`}>Open track</a>
    </div>
  {/if}
