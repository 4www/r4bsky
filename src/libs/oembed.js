export const PROVIDERS = {
  'www.youtube.com': 'youtube',
  'm.youtube.com': 'youtube',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'soundcloud.com': 'soundcloud',
  'vimeo.com': 'vimeo',
}

const OEMBED_PROVIDERS = {
  soundcloud: 'https://soundcloud.com/oembed?format=json&url=',
  youtube: 'https://www.youtube.com/oembed?url=',
  vimeo: 'https://vimeo.com/api/oembed.json?url=',
}

const getProvider = (hostname) => PROVIDERS[hostname]
const getProviderOEmbedUrl = (provider, urlText) => `${OEMBED_PROVIDERS[provider]}${urlText}`

export const getOEmbedUrl = (urlAddress) => {
  try {
    const url = new URL(urlAddress)
    const provider = getProvider(url.hostname)
    if (provider) {
      return getProviderOEmbedUrl(provider, urlAddress)
    }
  } catch (_) {}
}

export const fetchOEmbed = async (mediaProviderUrl) => {
  const oEmbedUrl = getOEmbedUrl(mediaProviderUrl)
  if (!oEmbedUrl) return { error: 'Error fetching oembed for this url' }
  const res = await fetch(oEmbedUrl)
  return res.json()
}

