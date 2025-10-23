// Helpers for at:// URIs and related route links

import { AtUri } from '@atproto/api'

export function parseAtUri(uri) {
  try {
    const at = new AtUri(uri)
    return { repo: at.hostname, collection: at.collection, rkey: at.rkey }
  } catch (_) {
    return null
  }
}

export function buildTrackUri(repo, rkey, collection = 'com.radio4000.track') {
  if (!repo || !rkey) return null
  return `at://${repo}/${collection}/${rkey}`
}

export function buildEditHash(sessionHandle, uri) {
  const parsed = parseAtUri(uri)
  if (!parsed) return null
  const { repo, rkey } = parsed
  if (sessionHandle) return `#/@${encodeURIComponent(sessionHandle)}/${encodeURIComponent(rkey)}/edit`
  return `#/${encodeURIComponent(repo)}/${encodeURIComponent(rkey)}/edit`
}

export function buildViewHash(sessionHandle, uri) {
  const parsed = parseAtUri(uri)
  if (!parsed) return null
  const { repo, rkey } = parsed
  if (sessionHandle) return `#/@${encodeURIComponent(sessionHandle)}/${encodeURIComponent(rkey)}`
  return `#/${encodeURIComponent(repo)}/${encodeURIComponent(rkey)}`
}
