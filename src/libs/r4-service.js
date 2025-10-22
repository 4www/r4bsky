import {bskyOAuth} from './bsky-oauth.js'
import {parseTrackUrl} from './url-patterns.js'

export const R4_COLLECTION = 'com.radio4000.track'

function assertAgent() {
  if (!bskyOAuth.agent) throw new Error('Not authenticated')
  return bskyOAuth.agent
}

export async function getMyDid() {
  const agent = assertAgent()
  return agent.did
}

export async function resolveHandle(handle) {
  const agent = assertAgent()
  const res = await agent.resolveHandle({handle})
  return res.data?.did
}

export async function createTrack({url, title, description, discogs_url}) {
  const agent = assertAgent()
  const record = {
    url,
    title,
    description: description || undefined,
    discogsUrl: discogs_url || undefined,
    createdAt: new Date().toISOString(),
  }
  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.accountDid,
    collection: R4_COLLECTION,
    record,
  })
  return res
}

export async function listTracksByDid(did, {cursor, limit = 30} = {}) {
  const agent = assertAgent()
  const res = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: R4_COLLECTION,
    limit,
    cursor,
    reverse: true,
  })
  const items = (res.data?.records || []).map((r) => ({uri: r.uri, cid: r.cid, ...r.value}))
  // Only keep items that have a parsable URL
  const tracks = items.filter((it) => parseTrackUrl(it.url))
  return {tracks, cursor: res.data?.cursor}
}

