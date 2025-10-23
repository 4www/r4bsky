import {bskyOAuth} from './bsky-oauth.js'
import {parseTrackUrl} from './url-patterns.js'
import { Agent, AtUri } from '@atproto/api'

export const R4_COLLECTION = 'com.radio4000.track'

function assertAgent() {
  if (!bskyOAuth.agent) throw new Error('Not authenticated')
  return bskyOAuth.agent
}

async function withDpopRetry(fn) {
  try {
    return await fn()
  } catch (e) {
    const msg = String(e?.message || e)
    if (msg.includes('use_dpop_nonce') || msg.includes('DPoP')) {
      // Retry once after nonce update
      try {
        return await fn()
      } catch (e2) {
        throw e2
      }
    }
    throw e
  }
}

let publicAgent
function getPublicAgent() {
  if (!publicAgent) publicAgent = new Agent({ service: 'https://api.bsky.app' })
  return publicAgent
}

export async function getMyDid() {
  const agent = assertAgent()
  return agent.did
}

export async function resolveHandle(handle) {
  const agent = getPublicAgent()
  const res = await agent.resolveHandle({handle})
  return res.data?.did
}

export async function createTrack({url, title, description, discogs_url}) {
  const agent = assertAgent()
  // Save to the custom collection only (no feed posting)
  const record = {
    url,
    title,
    description: description || undefined,
    discogsUrl: discogs_url || undefined,
    createdAt: new Date().toISOString(),
  }
  try {
    return await withDpopRetry(() => agent.com.atproto.repo.createRecord({
      repo: agent.accountDid,
      collection: R4_COLLECTION,
      record,
    }))
  } catch (err) {
    const msg = String(err?.message || err)
    if (msg.includes('repo:com.radio4000.track?action=create')) {
      const e2 = new Error('Missing permission to save to library. Open Settings to re-consent. If on localhost, set a HTTPS client metadata URL and re-login.')
      e2.code = 'scope-missing'
      throw e2
    }
    throw err
  }
}

export async function listTracksByDid(did, {cursor, limit = 30} = {}) {
  // Use authenticated agent for own repo; public appview for others
  let useAuth = false
  let my
  try {
    my = assertAgent()
    useAuth = (my.accountDid === did || my.did === did)
  } catch {}
  async function fetchWith(agent) {
    return agent.com.atproto.repo.listRecords({
      repo: did,
      collection: R4_COLLECTION,
      limit,
      cursor,
      reverse: true,
    })
  }
  let res
  try {
    res = await fetchWith(useAuth ? my : getPublicAgent())
  } catch (e) {
    const msg = String(e?.message || e)
    // Fallback: try with authenticated agent if public appview returns 404/not found
    if (!useAuth) {
      try {
        res = await fetchWith(assertAgent())
      } catch (e2) {
        throw e2
      }
    } else {
      throw e
    }
  }
  const items = (res.data?.records || []).map((r) => ({uri: r.uri, cid: r.cid, rkey: r.uri?.split('/').pop(), ...r.value}))
  // Only keep items that have a parsable URL
  const tracks = items.filter((it) => parseTrackUrl(it.url))
  return {tracks, cursor: res.data?.cursor}
}

// Social helpers
export async function searchActors(query, {limit = 25} = {}) {
  const agent = getPublicAgent()
  const res = await agent.searchActors({ q: query, limit })
  return res.data?.actors || []
}

export async function getFollowers(did, {limit = 50, cursor} = {}) {
  const agent = getPublicAgent()
  try {
    const res = await agent.getFollowers({ actor: did, limit, cursor })
    return { followers: res.data?.followers || [], cursor: res.data?.cursor }
  } catch (e) {
    throw scopeError(e)
  }
}

export async function getFollows(did, {limit = 50, cursor} = {}) {
  const agent = getPublicAgent()
  try {
    const res = await agent.getFollows({ actor: did, limit, cursor })
    return { follows: res.data?.follows || [], cursor: res.data?.cursor }
  } catch (e) {
    throw scopeError(e)
  }
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
  const did = assertAgent().accountDid
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

function scopeError(e) {
  const msg = String(e?.message || e)
  if (msg.includes('ScopeMissingError') || msg.includes('Missing required scope')) {
    const err = new Error(msg)
    err.code = 'scope-missing'
    return err
  }
  return e
}

export function isScopeMissing(err) {
  return err?.code === 'scope-missing'
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
  const existing = await withDpopRetry(() => agent.com.atproto.repo.getRecord({
    repo,
    collection,
    rkey,
  }))
  const record = existing.data?.value || {}
  const updated = {
    ...record,
    ...changes,
  }
  return withDpopRetry(() => agent.com.atproto.repo.putRecord({
    repo,
    collection,
    rkey,
    record: updated,
  }))
}

export async function getTrackByUri(uri) {
  const agent = assertAgent()
  const at = new AtUri(uri)
  const repo = at.hostname
  const collection = at.collection || R4_COLLECTION
  const rkey = at.rkey
  const res = await withDpopRetry(() => agent.com.atproto.repo.getRecord({ repo, collection, rkey }))
  const value = res.data?.value || {}
  return { uri, ...value }
}
