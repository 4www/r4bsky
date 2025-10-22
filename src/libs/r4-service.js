import {bskyOAuth} from './bsky-oauth.js'
import {parseTrackUrl} from './url-patterns.js'
import { AtUri } from '@atproto/api'

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
  const items = (res.data?.records || []).map((r) => ({uri: r.uri, cid: r.cid, rkey: r.uri?.split('/').pop(), ...r.value}))
  // Only keep items that have a parsable URL
  const tracks = items.filter((it) => parseTrackUrl(it.url))
  return {tracks, cursor: res.data?.cursor}
}

// Social helpers
export async function searchActors(query, {limit = 25} = {}) {
  const agent = assertAgent()
  const res = await agent.searchActors({ q: query, limit })
  return res.data?.actors || []
}

export async function getFollowers(did, {limit = 50, cursor} = {}) {
  const agent = assertAgent()
  const res = await agent.getFollowers({ actor: did, limit, cursor })
  return { followers: res.data?.followers || [], cursor: res.data?.cursor }
}

export async function getFollows(did, {limit = 50, cursor} = {}) {
  const agent = assertAgent()
  const res = await agent.getFollows({ actor: did, limit, cursor })
  return { follows: res.data?.follows || [], cursor: res.data?.cursor }
}

export async function followActor(subjectDid) {
  const agent = assertAgent()
  return agent.follow(subjectDid)
}

export async function unfollowActor(followUri) {
  const agent = assertAgent()
  return agent.deleteFollow(followUri)
}

// Find existing follow record for subjectDid, returns uri or null
export async function findFollowUri(subjectDid) {
  const agent = assertAgent()
  const me = agent.accountDid
  const res = await agent.com.atproto.repo.listRecords({
    repo: me,
    collection: 'app.bsky.graph.follow',
    limit: 100,
    reverse: true,
  })
  const rec = (res.data?.records || []).find((r) => r.value?.subject === subjectDid)
  return rec?.uri || null
}

// Timeline mix: gather latest tracks from followed accounts
export async function timelineTracks({limitPerActor = 10} = {}) {
  const agent = assertAgent()
  const did = agent.accountDid
  const {follows} = await getFollows(did, {limit: 100})
  const actorDids = follows.map((f) => f.did)
  const chunks = await Promise.all(
    actorDids.map(async (aDid) => {
      try {
        const {tracks} = await listTracksByDid(aDid, {limit: limitPerActor})
        return tracks.map((t) => ({...t, authorDid: aDid}))
      } catch {
        return []
      }
    })
  )
  const merged = chunks.flat()
  // Sort by createdAt if present, else leave order
  merged.sort((a, b) => {
    const ad = Date.parse(a.createdAt || a.created_at || 0)
    const bd = Date.parse(b.createdAt || b.created_at || 0)
    return bd - ad
  })
  return merged
}

export async function deleteTrackByUri(uri) {
  const agent = assertAgent()
  const at = new AtUri(uri)
  const repo = at.hostname
  const collection = at.collection || R4_COLLECTION
  const rkey = at.rkey
  return agent.com.atproto.repo.deleteRecord({
    repo,
    collection,
    rkey,
  })
}

export async function updateTrackByUri(uri, changes) {
  const agent = assertAgent()
  const at = new AtUri(uri)
  const repo = at.hostname
  const collection = at.collection || R4_COLLECTION
  const rkey = at.rkey
  const existing = await agent.com.atproto.repo.getRecord({
    repo,
    collection,
    rkey,
  })
  const record = existing.data?.value || {}
  const updated = {
    ...record,
    ...changes,
  }
  return agent.com.atproto.repo.putRecord({
    repo,
    collection,
    rkey,
    record: updated,
  })
}
