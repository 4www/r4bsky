export const DISCOGS_URL = 'discogs.com'
export const DISCOGS_API_URL = 'api.discogs.com'
export const DiscogsResourceTypes = ['release', 'master']
export const DiscogsSearchResourceTypes = [...DiscogsResourceTypes, 'artist', 'label', 'all']

export const fetchDiscogs = async ({id, type = DiscogsResourceTypes[0]}) => {
  const url = buildApiUrl({type, id})
  const response = await fetch(url)
  const data = await response.json()
  if (data.errors) throw new Error(data.errors)
  return data
}

const buildApiUrl = ({type, id}) => new URL(`${type}s/${id}`, `https://${DISCOGS_API_URL}`).href

export const parseUrl = (url) => {
  const discogsUrl = new URL(url)
  if (discogsUrl.hostname.endsWith(DISCOGS_URL)) {
    const parts = discogsUrl.pathname.slice(1).split('/')
    const type = [parts[0], parts[1]].find((t) => DiscogsResourceTypes.includes(t))
    if (type) {
      const idx = parts.indexOf(type)
      const id = parts.slice(idx + 1)[0].split('-')[0]
      return { id, type }
    }
  }
}

export const extractSuggestions = ({year = 0, genres = [], styles = [], labels = []}) => {
  const labelNames = labels?.map(({name}) => name)
  return [...genres, ...styles, year, ...labelNames]
    .filter(Boolean)
    .map((s) => s.toString().replace(' ', '-').toLowerCase())
}

