// URL parsing utilities for music/video providers using URLPattern API
// Returns a normalized representation for supported providers or null if unsupported.

export function parseTrackUrl(input) {
  try {
    const url = new URL(input)

    // YouTube short and watch links
    const ytShort = new URLPattern({protocol: 'https:', hostname: 'youtu.be', pathname: '/:id'})
    const ytWatch = new URLPattern({protocol: 'https:', hostname: '{www.,m.,music.}?youtube.com', pathname: '/watch'})

    // SoundCloud track
    const scTrack = new URLPattern({protocol: 'https:', hostname: '{www.}?soundcloud.com', pathname: '/:user/:slug'})

    // Vimeo video
    const vimeo = new URLPattern({protocol: 'https:', hostname: '{www.}?vimeo.com', pathname: '/:id'})

    // Bandcamp track
    const bandcamp = new URLPattern({protocol: 'https:', hostname: ':subdomain.bandcamp.com', pathname: '/track/:slug'})

    // Generic direct media file (mp3, wav, ogg, flac, m4a, mp4)
    const file = new URLPattern({protocol: 'https:', hostname: '*', pathname: '/*.:ext'})

    // YouTube
    if (ytShort.test(url)) {
      const {pathname} = url
      const id = pathname.slice(1)
      return {provider: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}`}
    }
    if (ytWatch.test(url)) {
      const id = url.searchParams.get('v')
      if (id) return {provider: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}`}
    }

    // SoundCloud
    if (scTrack.test(url)) {
      const match = scTrack.exec(url)
      const user = match.pathname.groups.user
      const slug = match.pathname.groups.slug
      return {provider: 'soundcloud', id: `${user}/${slug}`, url: `https://soundcloud.com/${user}/${slug}`}
    }

    // Vimeo
    if (vimeo.test(url)) {
      const id = vimeo.exec(url).pathname.groups.id
      return {provider: 'vimeo', id, url: `https://vimeo.com/${id}`}
    }

    // Bandcamp
    if (bandcamp.test(url)) {
      const m = bandcamp.exec(url)
      const sub = m.hostname.groups.subdomain
      const slug = m.pathname.groups.slug
      return {provider: 'bandcamp', id: `${sub}/track/${slug}`, url: `https://${sub}.bandcamp.com/track/${slug}`}
    }

    // Direct media file
    if (file.test(url)) {
      const ext = file.exec(url).pathname.groups.ext?.toLowerCase()
      const supported = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'mp4', 'webm']
      if (supported.includes(ext)) return {provider: 'file', id: url.href, url: url.href}
    }

    return null
  } catch (_) {
    return null
  }
}

export function extractFirstTrackUrl(text) {
  if (!text) return null
  // naive URL extraction; rely on parser to validate
  const m = text.match(/https?:\/\/\S+/)
  if (!m) return null
  return parseTrackUrl(m[0])
}

